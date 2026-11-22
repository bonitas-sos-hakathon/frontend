// Métadonnées de présentation uniquement. Les quiz, questions, options et bonnes réponses
// sont chargés depuis Supabase par les Edge Functions.
export const categories = [
  { id: 'hygiene', title: 'النظافة والصحة', blurb: 'عادات يومية تحافظ على صحتنا', icon: 'sparkles', tone: 'cyan' },
  { id: 'social', title: 'التربية الاجتماعية', blurb: 'اللطف والاحترام والصداقة', icon: 'heart', tone: 'coral' },
  { id: 'body', title: 'حماية الجسم', blurb: 'تربية جنسية مناسبة للعمر: جسمي ملكي', icon: 'shield', tone: 'navy' },
]
