import { Types } from 'mongoose';
import { Referral } from '../models/Referral';
import { Registration } from '../models/Registration';
import { User } from '../models/User';
import { canonicalEmail } from '../utils/email';
import { AppError, isDuplicateKeyError } from '../utils/errors';
import { generateReferralCode } from '../utils/referralCode';
import { RegisterInput } from '../validators/registration';
import { recordEvent } from './analyticsService';
import { NotCreditedReason, evaluateReferral } from './referralRules';
import { formatRegistrationId, resolveChannel } from './registrationRules';

const MAX_CODE_ATTEMPTS = 5;
const duplicateEmailError = () =>
  new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'This email is already registered for the workshop.');

/** Creates the user with a unique referral code. Unique indexes (not pre-checks) are the real guard against races. */
async function createUser(input: RegisterInput, canonical: string, referrerId: Types.ObjectId | null) {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    try {
      return await User.create({
        name: input.name,
        email: input.email,
        canonicalEmail: canonical,
        college: input.college,
        branch: input.branch,
        graduationYear: input.graduationYear,
        phone: input.phone,
        referralCode: generateReferralCode(input.name),
        referredBy: referrerId,
      });
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err;
      if (err.keyPattern && 'canonicalEmail' in err.keyPattern) throw duplicateEmailError();
      // otherwise the referral code collided: loop and generate another
    }
  }
  throw new AppError(500, 'CODE_GENERATION_FAILED', 'Could not generate a referral code. Please retry.');
}

export async function registerStudent(input: RegisterInput) {
  const canonical = canonicalEmail(input.email);
  if (await User.exists({ canonicalEmail: canonical })) throw duplicateEmailError();

  const referrer = input.referralCode
    ? await User.findOne({ referralCode: input.referralCode }).select('_id email').lean()
    : null;

  // Decide credit BEFORE writing so referredBy is set correctly in a single insert.
  const decision = evaluateReferral({
    code: input.referralCode,
    referrer,
    newEmail: input.email,
    alreadyReferred: false, // brand-new user; the unique index on Referral.referredUserId is the hard guard
  });

  const user = await createUser(input, canonical, decision.credited && referrer ? referrer._id : null);

  let credited = decision.credited;
  let reason: NotCreditedReason | undefined = decision.credited ? undefined : decision.reason;

  if (decision.credited && referrer) {
    try {
      await Referral.create({
        referrerUserId: referrer._id,
        referredUserId: user._id,
        referralCode: input.referralCode,
      });
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err;
      credited = false;
      reason = 'already_referred';
    }
  }

  const channel = resolveChannel({ referralCredited: credited, utmSource: input.utmSource, selfReported: input.source });
  const registration = await Registration.create({
    userId: user._id,
    source: channel,
    selfReportedSource: input.source,
    medium: input.utmMedium,
    campaign: input.utmCampaign,
    referralCode: credited ? input.referralCode : null,
  });

  await recordEvent({ eventType: 'registration_completed', userId: user._id, source: channel });
  if (credited) await recordEvent({ eventType: 'referral_registration', userId: user._id, source: 'referral', metadata: { referralCode: input.referralCode ?? '' } });

  return {
    registrationId: formatRegistrationId(String(registration._id)),
    user: { id: String(user._id), name: user.name, referralCode: user.referralCode },
    referralPath: `/register?ref=${user.referralCode}`,
    referral: credited ? { credited: true } : { credited: false, reason },
  };
}
