'use client'

import { useState } from 'react'

const FAQS = [
  {
    q: 'Does PreRoll.io replace my hosting platform?',
    a: 'No. It sits on top of it. PreRoll.io manages your production — who\'s doing what, what\'s approved, what\'s late — and publishes to Transistor.fm when you\'re ready. Keep using your existing host for distribution.',
  },
  {
    q: 'Where do the audio and video files actually live?',
    a: 'Wherever your team already works. PreRoll.io connects to Frame.io, Google Drive, and Vimeo for delivery and review. It links to the asset of record so versions stay in sync. You can also upload files directly to an episode.',
  },
  {
    q: 'How good is the AI, and what model is it?',
    a: 'It\'s built on Claude and Deepgram. Upload audio and it auto-transcribes, then generates ranked title suggestions, full show notes, episode descriptions, and social posts for Twitter, LinkedIn, and Instagram. Every draft lands in the episode for a human to edit and approve.',
  },
  {
    q: 'What can the API and the MCP server actually do?',
    a: 'Everything the app does. The REST API covers clients, shows, episodes, stages, files, deliverables, transcripts, AI generation, and publishing, with webhooks for stage changes and approvals. The MCP server wraps those same operations as tools, so Claude or any AI assistant can manage your production directly.',
  },
  {
    q: 'Can my clients use it without paying for a seat?',
    a: 'Yes. The client review portal is free and unlimited. You send a magic link; they review files, leave feedback, and approve deliverables. They never need an account or a paid seat.',
  },
  {
    q: 'We\'re on a spreadsheet / Trello / Notion today. How hard is moving?',
    a: 'PreRoll.io is lightweight enough to run alongside what you have. Most producers set up their shows and stages in an afternoon, then start managing new episodes in PreRoll while wrapping up old ones wherever they are.',
  },
  {
    q: 'What about security and access control?',
    a: 'Every workspace is isolated by organization. On the Studio plan, you get role-based access (owner, admin, member) so you can control who can do what. Clients only ever see the episodes you\'ve explicitly shared with them.',
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
