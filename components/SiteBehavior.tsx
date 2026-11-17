'use client';

import { useEffect, useRef, useState } from 'react';

/** Small React enhancement layer; the full page still renders without JavaScript. */
export default function SiteBehavior({ bodyClass }: { bodyClass: string }) {
  const [video, setVideo] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    document.body.className = bodyClass;
    const cleanup: (() => void)[] = [];
    const menu = document.getElementById('mobile-menu');
    const trigger = document.getElementById('menu-icon');
    const close = () => {
      menu?.classList.remove('sidemenu-on');
      menu?.classList.add('sidemenu-off');
      document.body.classList.remove('mobile-menu-visible');
      trigger?.setAttribute('aria-expanded', 'false');
    };
    trigger?.setAttribute('aria-expanded', 'false');
    trigger?.setAttribute('aria-controls', 'mobile-menu');
    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest('a, button');
      if (!target) return;
      if (target.classList.contains('tb_title_accordion') || target.closest('.accordion-title')) {
        const title = target.closest('.accordion-title');
        const link = title?.querySelector('a');
        const panel = title?.nextElementSibling as HTMLElement | null;
        if (link && panel) {
          event.preventDefault();
          const open = link.getAttribute('aria-expanded') !== 'true';
          link.setAttribute('aria-expanded', String(open));
          panel.setAttribute('aria-hidden', String(!open));
          panel.classList.toggle('tf_hide', !open);
          panel.style.display = open ? 'block' : 'none';
          title?.parentElement?.classList.toggle('current', open);
          title?.querySelector('.accordion-icon')?.classList.toggle('tf_hide', open);
          title?.querySelector('.accordion-active-icon')?.classList.toggle('tf_hide', !open);
        }
      } else if (target.classList.contains('track-title')) {
        event.preventDefault();
        const audio = target.closest('.track')?.querySelector('audio');
        if (audio) {
          if (audio.paused) void audio.play().catch(() => {});
          else audio.pause();
        }
      } else if (target.id === 'menu-icon') {
        event.preventDefault();
        const open = !menu?.classList.contains('sidemenu-on');
        if (!open) return close();
        menu?.classList.remove('sidemenu-off');
        menu?.classList.add('sidemenu-on');
        document.body.classList.add('mobile-menu-visible');
        trigger?.setAttribute('aria-expanded', 'true');
      } else if (target.id === 'menu-icon-close') {
        event.preventDefault(); close(); trigger?.focus();
      } else if (target.classList.contains('sby_video_thumbnail') || target.closest('.sby_item') && target.getAttribute('href')?.includes('youtube.com/watch')) {
        const id = target.getAttribute('data-video-id') || target.closest('[data-video-id]')?.getAttribute('data-video-id');
        if (id) { event.preventDefault(); setVideo(id); }
      } else if (target.classList.contains('sbi_load_btn')) {
        event.preventDefault(); window.open('https://www.instagram.com/yalepitchesandtones/', '_blank', 'noopener,noreferrer');
      } else if (target.classList.contains('sby_load_btn')) {
        event.preventDefault(); window.open('https://www.youtube.com/@PitchesandTones', '_blank', 'noopener,noreferrer');
      } else if (target.classList.contains('back-top') || target.closest('.back-top')) {
        event.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    cleanup.push(() => document.removeEventListener('click', onClick), () => document.removeEventListener('keydown', onKey));
    const onPlay = (event: Event) => {
      document.querySelectorAll('audio').forEach(audio => { if (audio !== event.target) audio.pause(); });
    };
    document.addEventListener('play', onPlay, true);
    cleanup.push(() => document.removeEventListener('play', onPlay, true));

    for (const slider of document.querySelectorAll('.row-slider')) {
      const slides = [...slider.querySelectorAll<HTMLElement>('[data-bg]')];
      slides.forEach((slide, i) => {
        slide.style.backgroundImage = `url("${slide.dataset.bg}")`;
        slide.style.opacity = i === 0 ? '1' : '0';
      });
      if (slides.length > 1 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        let index = 0;
        const interval = window.setInterval(() => {
          if (document.hidden) return;
          slides[index].style.opacity = '0';
          index = (index + 1) % slides.length;
          slides[index].style.opacity = '1';
        }, Number(slider.getAttribute('data-sliderspeed')) || 5000);
        cleanup.push(() => clearInterval(interval));
      }
    }

    // Restore featured YouTube player without loading the old feed plugin.
    for (const player of document.querySelectorAll<HTMLElement>('.sby_player_wrap')) {
      const first = document.querySelector<HTMLElement>('.sby_item[data-video-id]');
      const id = first?.dataset.videoId;
      if (id) {
        const frame = document.createElement('iframe');
        frame.src = `https://www.youtube-nocookie.com/embed/${id}`;
        frame.title = 'Pitches & Tones performance';
        frame.loading = 'lazy';
        frame.allowFullscreen = true;
        player.replaceChildren(frame);
      }
    }
    for (const form of document.querySelectorAll<HTMLFormElement>('.wpcf7 form')) {
      const submit = (event: SubmitEvent) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const fields = new FormData(form);
        const subject = String(fields.get('your-subject') || 'Pitches & Tones inquiry');
        const body = `From: ${fields.get('your-name') || ''}\nEmail: ${fields.get('your-email') || ''}\n\n${fields.get('your-message') || ''}`;
        window.location.href = `mailto:yalepitchesandtones@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        const response = form.querySelector<HTMLElement>('.wpcf7-response-output');
        if (response) {
          response.textContent = 'Your email app will open with your message. Send it there to contact Pitches & Tones.';
          response.style.display = 'block';
          response.setAttribute('role', 'status');
        }
      };
      form.addEventListener('submit', submit);
      cleanup.push(() => form.removeEventListener('submit', submit));
    }
    return () => { cleanup.forEach(fn => fn()); close(); };
  }, [bodyClass]);

  useEffect(() => {
    if (video && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [video]);

  return <dialog ref={dialog} className="performance-dialog" onClose={() => setVideo(null)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} aria-label="Watch Pitches & Tones">
    <button className="video-close" aria-label="Close video" onClick={() => dialog.current?.close()}>×</button>
    {video && <iframe title="Pitches & Tones performance" src={`https://www.youtube-nocookie.com/embed/${video}?autoplay=1`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />}
  </dialog>;
}
