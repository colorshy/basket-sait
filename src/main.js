import { CinematicBasketballExperience } from './basketball-experience.js';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('webgl-canvas');

  // Initialize the Single Cinematic Basketball Experience
  const experience = new CinematicBasketballExperience({
    container,
    onSequenceComplete: () => {
      console.log('Basketball product reveal complete. Interactive mode active.');
    }
  });

  // Begin the exact requested opening sequence
  window.__experience = experience;
  experience.startOpeningSequence();

  // Top Navigation brand link (smooth scroll to top)
  const brandMark = document.querySelector('.brand-mark');
  if (brandMark) {
    brandMark.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Top Navigation pill links
  document.querySelectorAll('.nav-link[data-nav]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('data-nav');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Left Vertical Navigation Rail items
  document.querySelectorAll('.rail-item[data-rail]').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = item.getAttribute('data-rail');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Rail overview button (smooth scroll to top)
  const railOverview = document.querySelector('.rail-overview');
  if (railOverview) {
    railOverview.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Right Progress dots
  document.querySelectorAll('.p-dot[data-step]').forEach((dot) => {
    dot.addEventListener('click', (e) => {
      e.preventDefault();
      const step = parseInt(dot.getAttribute('data-step'), 10);
      experience.goToSection(step);
    });
  });

  // Right Progress Prev & Next chevrons
  const prevBtn = document.getElementById('progress-prev');
  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      experience.goToPrevSection();
    });
  }

  const nextBtn = document.getElementById('progress-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      experience.goToNextSection();
    });
  }

  // Replay Reveal Button (Hero Section)
  const replayBtn = document.getElementById('replay-btn');
  if (replayBtn) {
    replayBtn.addEventListener('click', (e) => {
      e.preventDefault();
      experience.replayReveal();
    });
  }

  // Replay Film Button (Section 5 Allocation)
  const replayFilmBtn = document.getElementById('replay-film-btn');
  if (replayFilmBtn) {
    replayFilmBtn.addEventListener('click', (e) => {
      e.preventDefault();
      experience.replayReveal();
    });
  }
});
