import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageScaffold } from '@/components/dashboard/PageScaffold'

const letters = ['Summit Paris', 'Dassault Systèmes', 'Capgemini', 'Orange Business', 'Thales']

export default function CoverLettersPage(): JSX.Element {
  return (
    <PageScaffold title="Cover Letters" subtitle="Generate, edit, copy and export tailored letters">
      <section className="grid gap-4 xl:grid-cols-[22rem_1fr]">
        <Card>
          <CardHeader><CardTitle>Recent letters</CardTitle></CardHeader>
          <div className="grid gap-2">
            {letters.map(letter => <button key={letter} className="rounded-md border border-border bg-elevated p-3 text-left text-sm text-[var(--text-secondary)]">{letter}</button>)}
          </div>
        </Card>
        <Card>
          <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
          <div className="rounded-md border border-border bg-elevated p-5 text-sm leading-7 text-[var(--text-secondary)]">
            <p>Objet : Candidature au poste de Business Applications Manager</p>
            <p className="mt-4">Madame, Monsieur,</p>
            <p className="mt-4">Fort de plus de 10 ans d'expérience en infrastructure IT et cyber-opérations, je vous soumets ma candidature avec un intérêt marqué pour le poste.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2"><Button variant="primary">Download PDF</Button><Button>Edit</Button><Button>Copy</Button></div>
        </Card>
      </section>
    </PageScaffold>
  )
}
