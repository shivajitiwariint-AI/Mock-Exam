import { redirect } from 'next/navigation'

// The old /question-bank page is retired. All questions and answers now live
// on the canonical /interview/questions page.
export default function LegacyQuestionBankRedirect() {
  redirect('/interview/questions')
}
