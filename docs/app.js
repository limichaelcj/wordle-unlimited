(function(){
  
  const gameState = {};

  document.addEventListener('DOMContentLoaded', init);

  function init(){
    document.getElementById('new-word').addEventListener('click', clickNewWord);
  }

  /* Listeners */

  function clickNewWord(e){
    const $btn = e.currentTarget;
    const $game = document.querySelector('.game-container');
    $game.classList.add('disabled');
    $btn.innerHTML = $btn.dataset.pendingText;

    setTimeout(() => {
      $game.classList.remove('disabled');
      $btn.innerHTML = $btn.dataset.defaultText;
      reveal('.game-board-container.hidden, .keyboard-container.hidden');
    }, 1000);
  }

  /* Helpers */

  function reveal(selector){
    const elements = document.querySelectorAll(selector);
    elements.forEach(elem => {
      elem.classList.remove('hidden');
      elem.style.opacity = 0;
      elem.style.transition = '500ms ease-out';
    });
    requestAnimationFrame(() => {
      elements.forEach(elem => {
        elem.style.opacity = 1;
      });
    });
  }

})();