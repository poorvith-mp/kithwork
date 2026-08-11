export const showcaseData = {
  metrics: [
    { label: 'Relationships', value: '12' },
    { label: 'Active projects', value: '3' },
    { label: 'Open tasks', value: '7' },
    { label: 'Pipeline', value: '$18.4k' },
  ],
  relationships: [
    { name: 'Maya Chen', company: 'Northstar Bicycle Co.', note: 'Scope review on Thursday' },
    { name: 'Daniel Brooks', company: 'Cedar & Loom', note: 'Waiting for product photos' },
    { name: 'Aisha Rahman', company: 'Fieldnote Studio', note: 'Follow up next week' },
  ],
  opportunities: [
    { title: 'Operations workspace rollout', company: 'Northstar Bicycle Co.', value: '$8,400', stage: 'Proposal' },
    { title: 'Partner portal discovery', company: 'Fieldnote Studio', value: '$6,200', stage: 'Qualified' },
    { title: 'Catalogue automation', company: 'Cedar & Loom', value: '$3,800', stage: 'Conversation' },
  ],
  projects: [
    { name: 'Website refresh', company: 'Northstar Bicycle Co.', progress: '72%' },
    { name: 'Partner onboarding', company: 'Fieldnote Studio', progress: '45%' },
    { name: 'Catalogue cleanup', company: 'Cedar & Loom', progress: '28%' },
  ],
  tasks: [
    { title: 'Send revised scope', context: 'Northstar Bicycle Co.', due: 'Today' },
    { title: 'Review onboarding checklist', context: 'Fieldnote Studio', due: 'Tomorrow' },
    { title: 'Prepare August follow-up', context: 'Cedar & Loom', due: 'Friday' },
  ],
} as const
