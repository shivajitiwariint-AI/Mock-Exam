export type AchievementDefinition = {
  key: string
  label: string
  description: string
  category: 'education' | 'goals' | 'health' | 'meditation' | 'interview' | 'growth'
  icon: string
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { key: 'edu_first_study',   label: 'First Steps',     description: 'Log your first study session',             category: 'education',  icon: '📚' },
  { key: 'edu_10_sessions',   label: 'Study Streak',    description: 'Log 10 study sessions',                    category: 'education',  icon: '🎓' },
  { key: 'edu_first_exam',    label: 'Test Taker',      description: 'Complete your first exam',                 category: 'education',  icon: '📝' },
  { key: 'edu_exam_90',       label: 'High Achiever',   description: 'Score 90% or higher on an exam',           category: 'education',  icon: '🏅' },
  { key: 'goals_first_goal',  label: 'Goal Setter',     description: 'Create your first goal',                   category: 'goals',      icon: '🏆' },
  { key: 'goals_completed',   label: 'Closer',          description: 'Complete your first daily goal',           category: 'goals',      icon: '✅' },
  { key: 'goals_life_goal',   label: 'Dream Big',       description: 'Create your first Life goal',              category: 'goals',      icon: '🌟' },
  { key: 'health_first_log',  label: 'Healthy Start',   description: 'Log your first health day',                category: 'health',     icon: '❤️' },
  { key: 'health_7_days',     label: 'Health Habit',    description: 'Log health data on 7 different days',      category: 'health',     icon: '💪' },
  { key: 'health_exercise',   label: 'Workout Warrior', description: 'Hit 30+ min exercise on 3 different days', category: 'health',     icon: '🏃' },
  { key: 'meditation_first',  label: 'Inner Peace',     description: 'Log your first meditation session',        category: 'meditation', icon: '🧘' },
  { key: 'meditation_7_days', label: 'Mindful Week',    description: 'Meditate on 7 different days',             category: 'meditation', icon: '🌿' },
  { key: 'interview_company', label: 'On the Hunt',     description: 'Add your first interview company',         category: 'interview',  icon: '🎯' },
  { key: 'interview_10_q',    label: 'Question Bank',   description: 'Add 10 interview questions',               category: 'interview',  icon: '💼' },
  { key: 'growth_score_25',   label: 'Growing Strong',  description: 'Reach a Growth Score of 25',               category: 'growth',     icon: '📈' },
  { key: 'growth_score_50',   label: 'Halfway There',   description: 'Reach a Growth Score of 50',               category: 'growth',     icon: '🚀' },
]
