import { UserSquare2, Plus, Eye, EyeOff, Trash2, ChevronUp, ChevronDown, Save, Pencil } from 'lucide-react';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { initials } from '@/lib/utils';
import { PageTitle, Panel, EmptyState } from '@/components/admin/ui';
import { ActionForm, ConfirmForm } from '@/components/admin/BulkForm';
import { SubmitButton, InfoNote } from '@/components/admin/interactive';
import { ImagePicker } from '@/components/admin/ImagePicker';
import { TeamMemberRow } from './TeamMemberRow';
import { saveTeamMember, deleteTeamMember, toggleTeamVisibility, moveTeamMember } from './actions';

export const metadata = { title: 'Our team' };

interface Member {
  id: number;
  name: string;
  designation: string;
  bio: string;
  photo_path: string | null;
  email: string;
  phone: string;
  linkedin: string;
  sort_order: number;
  is_visible: number;
}

export default async function TeamAdminPage() {
  const user = await requirePermission('team.view');
  const editable = can(user, 'team.edit');

  const members = db.all<Member>('SELECT * FROM team_members ORDER BY sort_order, id');
  const visible = members.filter((m) => m.is_visible === 1).length;

  return (
    <>
      <PageTitle
        title="Our team"
        subtitle={`${members.length} team member${members.length === 1 ? '' : 's'}, ${visible} shown on the website.`}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Add form */}
        {editable && (
          <div className="lg:col-span-1">
            <Panel title="Add a team member" description="They appear on the website straight away.">
              <ActionForm action={saveTeamMember} className="space-y-4">
                <ImagePicker
                  name="photo_path"
                  value=""
                  label="Photograph"
                  folder="team"
                  square
                  maxSize={800}
                  hint="Cropped to a square automatically."
                />

                <div>
                  <label className="label" htmlFor="t-name">Name</label>
                  <input id="t-name" name="name" required className="field" placeholder="Full name" />
                </div>

                <div>
                  <label className="label" htmlFor="t-designation">Designation</label>
                  <input
                    id="t-designation"
                    name="designation"
                    className="field"
                    placeholder="e.g. Manager - Recruitment"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="t-bio">Short line about them</label>
                  <textarea
                    id="t-bio"
                    name="bio"
                    rows={3}
                    maxLength={600}
                    className="field text-sm"
                    placeholder="Optional. One or two sentences."
                  />
                </div>

                <details className="rounded-xl border border-slate-200 p-3">
                  <summary className="cursor-pointer text-sm font-medium text-ink-soft">
                    Contact details (optional)
                  </summary>
                  <div className="mt-3 space-y-3">
                    <input name="email" type="email" className="field" placeholder="Email" />
                    <input name="phone" className="field" placeholder="Phone" />
                    <input name="linkedin" className="field" placeholder="LinkedIn profile URL" />
                  </div>
                </details>

                <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
                  <input
                    type="checkbox"
                    name="is_visible"
                    defaultChecked
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                  />
                  Show on the website
                </label>

                <SubmitButton className="btn-primary w-full" icon={<Plus className="h-4 w-4" />} pendingLabel="Adding…">
                  Add to the team
                </SubmitButton>
              </ActionForm>
            </Panel>
          </div>
        )}

        {/* List */}
        <div className={editable ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <Panel
            title="The team, in the order shown on the website"
            bodyClassName=""
          >
            {members.length === 0 ? (
              <EmptyState
                icon={UserSquare2}
                title="No team members yet"
                description="Add a name and a photograph and they will appear on the website immediately."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {members.map((member, index) => (
                  <TeamMemberRow
                    key={member.id}
                    member={member}
                    index={index}
                    total={members.length}
                    editable={editable}
                    canDelete={can(user, 'team.delete')}
                    save={saveTeamMember}
                    remove={deleteTeamMember}
                    toggle={toggleTeamVisibility}
                    move={moveTeamMember}
                  />
                ))}
              </ul>
            )}
          </Panel>

          <div className="mt-4">
            <InfoNote>
              The order here is the order they appear in on the website. Use the arrows to move
              someone up or down. Hiding a member keeps their record but takes them off the site.
            </InfoNote>
          </div>
        </div>
      </div>
    </>
  );
}
