export const SHARE_MESSAGE = 'I just registered for Build Your First AI Project in 60 Minutes. Want to build one too?';

export const referralLink = (origin: string, code: string): string => `${origin}/register?ref=${encodeURIComponent(code)}`;
export const whatsappUrl = (link: string): string => `https://wa.me/?text=${encodeURIComponent(`${SHARE_MESSAGE} ${link}`)}`;
// LinkedIn's share endpoint only accepts a URL (no prefilled text), so the copy button carries the full message.
export const linkedinUrl = (link: string): string => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`;
export const copyText = (link: string): string => `${SHARE_MESSAGE} ${link}`;
