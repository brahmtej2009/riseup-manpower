import { Briefcase, Plus } from 'lucide-react';
import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getServices } from '@/lib/content';
import { PageTitle, Panel, EmptyState } from '@/components/admin/ui';
import { ActionForm } from '@/components/admin/BulkForm';
import { SubmitButton, InfoNote } from '@/components/admin/interactive';
import { SERVICE_ICON_NAMES } from '@/components/cards';
import { ServiceRow } from './ServiceRow';
import { saveService, deleteService, toggleServiceVisibility, moveService } from './actions';

export const metadata = { title: 'Services' };

export default async function ServicesAdminPage() {
  const user = await requirePermission('services.view');
  const editable = can(user, 'services.edit');
  const services = getServices(false);

  return (
    <>
      <PageTitle
        title="Services"
        subtitle="The services listed on the home page and the services page."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {editable && (
          <div className="lg:col-span-1">
            <Panel title="Add a service">
              <ActionForm action={saveService} className="space-y-4">
                <div>
                  <label className="label" htmlFor="s-title">Title</label>
                  <input
                    id="s-title"
                    name="title"
                    required
                    className="field"
                    placeholder="e.g. Contract Staffing"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="s-icon">Icon</label>
                  <select id="s-icon" name="icon" className="field" defaultValue="Briefcase">
                    {SERVICE_ICON_NAMES.map((icon) => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label" htmlFor="s-summary">Short summary</label>
                  <textarea
                    id="s-summary"
                    name="summary"
                    rows={2}
                    maxLength={300}
                    className="field text-sm"
                    placeholder="One line, shown on the card."
                  />
                </div>

                <div>
                  <label className="label" htmlFor="s-description">Full description</label>
                  <textarea
                    id="s-description"
                    name="description"
                    rows={4}
                    maxLength={2000}
                    className="field text-sm"
                    placeholder="Shown on the services page."
                  />
                </div>

                <div>
                  <label className="label" htmlFor="s-points">Key points</label>
                  <textarea
                    id="s-points"
                    name="points"
                    rows={4}
                    className="field text-sm"
                    placeholder={'One point per line, e.g.\nStaff on our payroll\nPF and ESI maintained'}
                  />
                  <p className="help">One per line, up to ten.</p>
                </div>

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
                  Add the service
                </SubmitButton>
              </ActionForm>
            </Panel>
          </div>
        )}

        <div className={editable ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <Panel title="Services, in the order shown on the website" bodyClassName="">
            {services.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="No services yet"
                description="Add the services the company offers and they will appear on the website."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {services.map((service, index) => (
                  <ServiceRow
                    key={service.id}
                    service={service}
                    index={index}
                    total={services.length}
                    editable={editable}
                    canDelete={can(user, 'services.delete')}
                    icons={SERVICE_ICON_NAMES}
                    save={saveService}
                    remove={deleteService}
                    toggle={toggleServiceVisibility}
                    move={moveService}
                  />
                ))}
              </ul>
            )}
          </Panel>

          <div className="mt-4">
            <InfoNote>
              The first six services appear on the home page. All of them appear on the services
              page, in this order.
            </InfoNote>
          </div>
        </div>
      </div>
    </>
  );
}
