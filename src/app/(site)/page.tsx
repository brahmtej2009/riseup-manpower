import { getSettings, getSiteInfo, getStats, str, num, bool, list } from '@/lib/settings';
import {
  getTeam,
  getPublishedPosts,
  getServices,
  getGalleryPhotos,
  getClientLogos,
} from '@/lib/content';
import { getSocialPosts } from '@/lib/social';
import { Hero } from '@/components/home/Hero';
import { LogoMarquee } from '@/components/home/LogoMarquee';
import {
  ServicesSection,
  GallerySection,
  PostsSection,
  TeamSection,
  ClosingSection,
  SocialSection,
  SocialFeedSection,
} from '@/components/home/sections';

export const revalidate = 60;

export default async function HomePage() {
  const s = getSettings();
  const site = getSiteInfo();
  const stats = getStats();
  const team = getTeam();
  const squareFeed = bool(s, 'posts_square', true);
  const posts = getPublishedPosts(
    Math.min(Math.max(num(s, 'posts_home_count', 6), 1), 12)
  );
  const socialPosts = await getSocialPosts();

  const showServices = bool(s, 'services_show_home', true);
  const showGallery = bool(s, 'gallery_show_home', true);
  const showLogos = bool(s, 'logos_show_home', true);

  const services = showServices ? getServices() : [];
  const photos = showGallery ? getGalleryPhotos(true, Math.max(1, num(s, 'gallery_limit', 8))) : [];
  const logos = showLogos ? getClientLogos() : [];

  return (
    <>
      <Hero
        content={{
          title: str(s, 'hero_title', 'The right people,'),
          titleAccent: str(s, 'hero_title_accent'),
          subtitle: str(s, 'hero_subtitle'),
          note: str(s, 'hero_note'),
          ctaEmployer: str(s, 'hero_cta_employer', 'I need manpower'),
          ctaCandidate: str(s, 'hero_cta_candidate', 'I am looking for a job'),
          ctaPosts: str(s, 'hero_cta_posts', 'Posts'),
          gallery: list(s, 'hero_gallery'),
          rotatingWords: list(s, 'hero_rotating_words'),
          overlay: num(s, 'hero_overlay', 62),
        }}
        stats={bool(s, 'stats_show', true) ? stats : []}
        services={getServices().map((x) => x.title)}
        phone={site.phone}
      />

      <LogoMarquee
        logos={logos}
        heading={str(s, 'logos_heading')}
        height={num(s, 'logos_height', 72)}
        speed={num(s, 'logos_speed', 38)}
        grayscale={bool(s, 'logos_grayscale', false)}
      />

      <ServicesSection
        services={services}
        heading={str(s, 'services_heading', 'What we do')}
        intro={str(s, 'services_intro')}
      />

      <PostsSection
        items={posts}
        heading={str(s, 'posts_heading', 'Posts')}
        square={squareFeed}
        showMeta={bool(s, 'posts_show_meta', true)}
      />

      <GallerySection
        photos={photos}
        heading={str(s, 'gallery_heading', 'Gallery')}
        intro={str(s, 'gallery_intro')}
      />

      {bool(s, 'team_show_home', true) && (
        <TeamSection
          team={team}
          heading={str(s, 'team_heading', 'Our team')}
          intro={str(s, 'team_intro')}
        />
      )}

      <SocialFeedSection posts={socialPosts} heading={str(s, 'social_feed_heading', 'Latest posts')} />

      <ClosingSection site={site} heading={str(s, 'cta_heading', 'Tell us what you need')} />

      <SocialSection
        site={site}
        heading={str(s, 'social_heading', 'Follow us')}
        posts={posts}
      />
    </>
  );
}
