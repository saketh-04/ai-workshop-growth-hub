import { Check, Copy, MessageCircle, Share2 } from 'lucide-react';
import { useState } from 'react';
import { copyText, linkedinUrl, whatsappUrl } from '../lib/share';
import { track } from '../lib/track';
import { btn } from './ui';

export function ShareButtons({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    track('share_clicked', { channel: 'copy' });
    try {
      await navigator.clipboard.writeText(copyText(link));
    } catch {
      const ta = document.createElement('textarea'); // older browsers / non-secure contexts
      ta.value = copyText(link); document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex flex-wrap gap-2">
      <a className={btn.small} href={whatsappUrl(link)} target="_blank" rel="noopener noreferrer" onClick={() => track('share_clicked', { channel: 'whatsapp' })}>
        <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
      </a>
      <a className={btn.small} href={linkedinUrl(link)} target="_blank" rel="noopener noreferrer" onClick={() => track('share_clicked', { channel: 'linkedin' })}>
        <Share2 className="h-4 w-4" aria-hidden /> LinkedIn
      </a>
      <button className={btn.small} onClick={copy}>
        {copied ? <Check className="h-4 w-4 text-aqua" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        {copied ? 'Copied' : 'Copy link'}
      </button>
      <span className="sr-only" aria-live="polite">{copied ? 'Link copied to clipboard' : ''}</span>
    </div>
  );
}
