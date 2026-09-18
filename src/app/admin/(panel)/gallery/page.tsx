import Link from 'next/link';
import { Images, Palette } from 'lucide-react';
import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getGalleryPhotos } from '@/lib/content';
import { PageTitle, Panel, EmptyState } from '@/components/admin/ui';
import { InfoNote } from '@/components/admin/interactive';
import { AddPhotos, PhotoRow } from './GalleryAdmin';
import {
  addGalleryPhotos,
  saveGalleryPhoto,
  toggleGalleryPhoto,
  moveGalleryPhoto,
  removeGalleryPhoto,
} from './actions';

export const metadata = { title: 'Photo gallery' };

export default async function GalleryAdminPage() {
  const user = await requirePermission('gallery.view');
  const editable = can(user, 'gallery.edit');
  const photos = getGalleryPhotos(false);

  const visible = photos.filter((p) => p.is_visible === 1).length;

  return (
    <>
      <PageTitle
        title="Photo gallery"
        subtitle="The photographs shown in the gallery section of the home page, in this order."
        actions={
          <Link href="/admin/themes" className="btn-outline btn-sm">
            <Palette className="h-4 w-4" />
            Gallery settings
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {editable && (
          <div className="lg:col-span-1">
            <Panel title="Add photographs">
              <AddPhotos add={addGalleryPhotos} />
            </Panel>

            <div className="mt-4">
              <InfoNote>
                How many of these appear on the home page, and the heading above them, are set
                under Appearance on the Themes screen.
              </InfoNote>
            </div>
          </div>
        )}

        <div className={editable ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <Panel
            title="Photographs"
            description={
              photos.length
                ? `${photos.length} in the gallery, ${visible} shown on the website.`
                : undefined
            }
            bodyClassName=""
          >
            {photos.length === 0 ? (
              <EmptyState
                icon={Images}
                title="No photographs yet"
                description={
                  editable
                    ? 'Add photographs on the left and they will appear on the website straight away.'
                    : 'Nothing has been added to the gallery yet.'
                }
              />
            ) : (
              <ul className="divide-y divide-line">
                {photos.map((photo, index) => (
                  <PhotoRow
                    key={photo.id}
                    photo={photo}
                    index={index}
                    total={photos.length}
                    editable={editable}
                    canDelete={can(user, 'gallery.delete')}
                    save={saveGalleryPhoto}
                    toggle={toggleGalleryPhoto}
                    move={moveGalleryPhoto}
                    remove={removeGalleryPhoto}
                  />
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
