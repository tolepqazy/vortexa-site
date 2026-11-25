'use strict';

(() => {
  const specifications = document.querySelector('#specs .spec-disclosure');
  if (specifications) {
    const openSpecifications = () => { specifications.open = true; };
    document.querySelectorAll('a[href="#specs"]').forEach(link => link.addEventListener('click', openSpecifications));
    if (location.hash === '#specs') openSpecifications();
    window.addEventListener('hashchange', () => {
      if (location.hash === '#specs') openSpecifications();
    });
  }
})();
