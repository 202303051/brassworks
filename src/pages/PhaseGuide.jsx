import { Link } from 'react-router-dom';
import ApperIcon from '@/components/ApperIcon';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { phases } from '@/content/phase-plan';

export const route = { path: '/phase-guide', layout: 'public', access: 'public' };
export const nav = { label: 'Phase guide', icon: 'BookOpen', order: 20, profiles: null };

export default function PhaseGuide() {
  return (
    <div>
      <Button
        variant="ghost"
        asChild
        className="mb-6 min-h-12 px-0 hover:bg-transparent hover:underline"
      >
        <Link to="/">
          <ApperIcon name="ArrowLeft" size={18} />
          Back to Home
        </Link>
      </Button>
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Build record / v0.1.0 scope
      </p>
      <h1 className="mt-3 font-heading text-5xl font-bold uppercase sm:text-6xl">
        The foundation, documented.
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
        Review this phase and the path ahead. The complete source, detailed report and Git handoff
        are saved in your Apper project files.
      </p>

      <div className="mt-8 rounded-lg border border-warning-border bg-warning-muted p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-warning">
          <ApperIcon name="Info" size={18} />
          About this build
        </h2>
        <p className="mt-2 text-sm leading-7">
          This is a responsive Apper web scaffold. Native Android/iOS builds are not included.
          Factory records, login and live stock controls are scheduled for later phases.
        </p>
      </div>

      <Tabs defaultValue="overview" className="mt-8">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted p-1">
          <TabsTrigger value="overview" className="min-h-12 px-4">
            Phase plan
          </TabsTrigger>
          <TabsTrigger value="setup" className="min-h-12 px-4">
            Review checklist
          </TabsTrigger>
          <TabsTrigger value="report" className="min-h-12 px-4">
            Scaffold checks
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {phases.map((phase) => (
              <section
                key={phase.number}
                className={
                  phase.number === '00'
                    ? 'flex gap-5 border-b border-border bg-highlight/10 px-5 py-5 last:border-b-0 sm:px-7'
                    : 'flex gap-5 border-b border-border px-5 py-5 last:border-b-0 sm:px-7'
                }
              >
                <span className="font-heading text-4xl font-semibold text-muted-foreground">
                  {phase.number}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-heading text-2xl font-semibold">{phase.name}</h2>
                    <span
                      className={
                        phase.number === '00'
                          ? 'rounded-md bg-highlight px-3 py-1 text-[11px] font-bold text-highlight-foreground'
                          : 'text-[11px] font-semibold text-muted-foreground'
                      }
                    >
                      {phase.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {phase.description}
                  </p>
                </div>
              </section>
            ))}
          </div>
          <p className="mt-5 text-sm font-semibold">Next instruction: “DONE, next phase”.</p>
        </TabsContent>
        <TabsContent value="setup" className="mt-6">
          <section className="rounded-lg border border-border bg-card p-5 sm:p-7">
            <h2 className="font-heading text-3xl font-semibold">Review before the next phase</h2>
            <ol className="mt-5 list-decimal space-y-4 pl-5 text-sm leading-7 text-muted-foreground">
              <li>Open both department cards and return Home.</li>
              <li>Check the layout on your Android phone and desktop.</li>
              <li>Try light, dark and system themes.</li>
              <li>Check the header date and IST clock.</li>
              <li>
                In your Apper project source, read README.md and the files under docs/ for the
                complete handoff.
              </li>
              <li>Reply “DONE, next phase” when you want Phase 1 to begin.</li>
            </ol>
          </section>
          <section className="mt-5 rounded-lg border border-border bg-card p-5 sm:p-7">
            <h2 className="font-heading text-2xl font-semibold">Your project files</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Complete source files, setup instructions, exact Git commands, the original brief, bug
              register and detailed test report are retained in the Apper project source. They are
              not included as a public download on this page.
            </p>
          </section>
        </TabsContent>
        <TabsContent value="report" className="mt-6">
          <section className="rounded-lg border border-border bg-card p-5 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Executed scaffold checks
            </p>
            <div className="mt-5 flex flex-wrap items-end gap-3">
              <span className="font-heading text-7xl font-semibold leading-none">18</span>
              <span className="pb-1 text-sm font-semibold text-highlight">
                tests passed · 0 failed
              </span>
            </div>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground">
              Tests cover the date/time utility and selected custom-source checks. The utility has
              100% line, branch and function coverage. Scoped lint and formatting checks also
              passed. These results do not cover future factory workflows or production security.
            </p>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              The detailed Test, Attack & Fix Report is in docs/TEST_ATTACK_FIX_REPORT.md in your
              Apper source. Review the final chat handoff for the deployment and browser-check
              results.
            </p>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
