(() => {
  'use strict';
  const picker=document.getElementById('studioPicker');
  if(!picker)return;
  document.addEventListener('pointerdown',event=>{
    if(picker.open&&!picker.contains(event.target))picker.open=false;
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&picker.open){picker.open=false;picker.querySelector('summary')?.focus();}
  });
  picker.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{picker.open=false;}));
})();
