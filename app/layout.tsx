import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pitches & Tones – 99 Problems but a Pitch ain’t One',
  description: 'Pitches and Tones is an undergraduate SATB a cappella group at Yale University. A cappella without boundaries since 2011.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="wp-theme-themify-ultra skin-default sidebar-none default_width tb_animation_on ready-view header-leftpane footer-block theme-color-black theme-font-sans-serif tagline-off search-off footer-menu-navigation-off sidemenu-active">{children}</body></html>;
}
