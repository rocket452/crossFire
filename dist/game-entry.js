const url=new URL(location.href);
if(url.searchParams.get('scene')==='bastion'){url.searchParams.set('scene','testing');url.searchParams.set('enemy','bastion');history.replaceState(null,'',url);}
if(url.searchParams.get('scene')==='shuriken'){url.searchParams.set('scene','testing');history.replaceState(null,'',url);}
await import('./battle.js?v=volt-storm-259');
