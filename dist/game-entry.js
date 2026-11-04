const url=new URL(location.href);
if(url.searchParams.get('scene')==='bastion'){url.searchParams.set('scene','testing');url.searchParams.set('enemy','bastion');history.replaceState(null,'',url);}
if(url.searchParams.get('scene')==='shuriken')await import('./ninja-lab.js?v=argus-jukes-203');
else await import('./battle.js?v=argus-beam-duration-204');
