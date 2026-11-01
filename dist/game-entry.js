const scene=new URLSearchParams(location.search).get('scene');
if(scene==='bastion')await import('./bastion-arena.js?v=bastion-122');
else await import('./battle.js?v=bastion-menu-122');
