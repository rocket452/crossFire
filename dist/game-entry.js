const url=new URL(location.href);
if(url.searchParams.get('scene')==='bastion'){url.searchParams.set('scene','testing');url.searchParams.set('enemy','bastion');history.replaceState(null,'',url);}
if(url.searchParams.get('scene')==='shuriken')await import('./ninja-lab.js?v=shadow-kunai-143');
else await import('./battle.js?v=collapse-settle-147');
