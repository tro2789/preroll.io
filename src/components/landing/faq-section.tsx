'use client'

import { useState } from 'react'

const FAQS = [
  {
    q: 'Does PreRoll.io replace my hosting platform?',
    a: 'No. It sits on top of it. PreRoll.io manages the production pipeline (who\'s doing what, what\'s approved, what\'s late) and connects to your host so published metadata and dates stay in sync. Keep Captivate, Transistor, Megaphone, whatever you use.',
  },
  {
    q: 'Where do the audio and video files actually live?',
    a: 'In Frame.io if you use it. PreRoll.io links to the asset of record, so reviews and versions stay where your team already works. You can also upload files directly to an episode if you\'d rather keep everything in one place.',
  },
  {
    q: 'How good is the AI, and what model is it?',
    a: 'It\'s built on Claude, and it\'s good enough to beat the blank page: ranked titles, full show notes, timestamped chapters, a clean transcript. It is not a publish-it-and-walk-away button. Every draft lands in the episode for a human to edit and approve.',
  },
  {
    q: 'What can the API and the MCP server actually do?',
    a: 'Everything the app does. The REST API covers shows, episodes, stages, files, deliverables, transcripts, and publishing, with webhooks for stage changes and approvals. The MCP server wraps those same operations as tools.',
  },
  {
    q: 'Can my clients use it without paying for a seat?',
    a: 'Yes. The client review portal is free and doesn\'t count against your seats. You send a link; they review, comment, and approve. Seats are only for the people inside your agency doing the production work.',
  },
  {
    q: 'We\'re on a spreadsheet / Trello / Notion today. How hard is moving?',
    a: 'Most teams import a CSV of in-flight episodes, map columns to stages once, and they\'re running the same day. On the Agency plan we\'ll do the migration with you.',
  },
  {
    q: 'What about security and access control?',
    a: 'Role-based access on every plan; SSO/SAML and an audit log on Agency. Clients only ever see the episodes you\'ve shared with them. Data export is always available; it\'s your work, and you can take it with you.',
  },
]

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section id="faq" className="py-24 px-7 max-w-[1200px] mx-auto">
      <div className="text-center max-w-[64ch] mx-auto reveal">
        <span className="font-mono text-xs tracking-[0.12em] uppercase text-accent">FAQ</span>
        <h2 className="font-[family-name:var(--font-display)] text-[clamp(28px,3.4vw,40px)] font-semibold text-text-primary leading-[1.12] tracking-[-0.022em] mt-3.5">Questions we hear a lot</h2>
      </div>
      <div className="max-w-[780px] mx-auto mt-11">
        {FAQS.map((faq, i) => {
          const isOpen = openIndex === i
          return (
            <div key={i} className="border-b border-border-subtle">
              <button
                onClick={() => setOpenIndex(isOpen ? -1 : i)}
                className="w-full text-left flex items-center gap-4 py-5 px-1 font-[family-name:var(--font-display)] text-[16.5px] font-medium text-text-primary cursor-pointer"
              >
                {faq.q}
                <span className={`ml-auto shrink-0 transition-transform duration-[250ms] ${isOpen ? 'rotate-45 text-accent' : 'text-text-tertiary'}`}>
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </button>
              <div
                className="overflow-hidden transition-all duration-300"
                style={{ maxHeight: isOpen ? '300px' : '0px' }}
              >
                <div className="px-1 pb-5 text-text-secondary text-[15px] leading-relaxed max-w-[68ch]">
                  {faq.a}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
