// Astra Ronin key poses and timelines. Joint channels are Euler rotations (radians, XYZ) for named
// rig nodes; frameP is the pelvis offset and frameR the pelvis rotation (model units, root-local).
// wings: [spread, sweep, flutter]; thrusters: [pitch, 0, 0]; shield: [face weight, yaw, pitch] turns the
// shield on its forearm mount toward the body's front. feet: planted stance [x, z] per side.
// Sword elevation in the sagittal plane is -(arm.x + forearm.x + sword.x): 0 points the blade ahead,
// -PI/2 straight up. The right arm abducts with +z, the left with -z; +y swings an abducted arm back.
const R='right-upper-arm',RF='right-lower-arm',RW='right-wrist',L='left-upper-arm',LF='left-lower-arm',LW='left-wrist';
export const CHANNELS=['frameP','frameR','hips','torso','neck','head',R,RF,RW,'sword',L,LF,LW,'wings','thrusters','shield'];
const ZERO=[0,0,0];

// Heroic ready stance: shield side leads, knees loaded, blade held low and forward.
export const READY={frameP:[0,-.32,0],frameR:[0,.18,0],hips:[0,0,0],torso:[.08,.12,-.02],neck:[0,0,0],head:[-.04,-.25,0],
 [R]:[-.3,-.15,.32],[RF]:[-.55,0,0],[RW]:[0,0,0],sword:[.55,.1,0],
 [L]:[-.55,0,-.2],[LF]:[-1.4,0,0],[LW]:[0,0,0],wings:[0,0,0],thrusters:[0,0,0],shield:[.85,.4,-.05],
 feet:{left:[-.95,.75],right:[.9,-.55]}};

export const POSES={READY};
const pose=(name,p)=>{POSES[name]=p;return p;};

// Walking carriage: squarer to the path, blade carried low; the gait layer adds the cycle on top.
pose('WALK',{shield:[.7,.3,0],frameP:[0,-.2,0],frameR:[0,.05,0],torso:[.14,.04,0],head:[-.1,-.04,0],
 [R]:[-.18,-.1,.3],[RF]:[-.55,0,0],sword:[.75,.08,0],[L]:[-.6,.15,-.32],[LF]:[-.95,.1,.2]});

// ---- diagonal sweep (kesa-giri): coil the blade high on the sword side, cut down through the front, hold zanshin.
pose('SWEEP_GATHER',{shield:[.8,.5,0],frameP:[0,-.55,-.1],frameR:[0,.35,0],torso:[.05,.45,-.05],head:[-.02,-.5,0],
 [R]:[-.55,.35,.75],[RF]:[-.7,0,0],sword:[.7,.25,0],[L]:[-.9,.1,-.15],[LF]:[-1.15,.1,.3],wings:[.15,0,0],
 feet:{left:[-1.05,1.1],right:[1.05,-.85]}});
pose('SWEEP_COIL',{shield:[.75,.7,.1],frameP:[0,-.85,-.25],frameR:[.04,.4,-.04],torso:[-.06,.7,-.12],head:[0,-1,.05],
 [R]:[-.45,1,1.2],[RF]:[-.35,0,0],[RW]:[0,.2,0],sword:[.2,.5,0],[L]:[-1.25,-.35,-.05],[LF]:[-1.05,0,.4],wings:[.35,.1,0],
 feet:{left:[-1.15,1.45],right:[1.15,-1.05]}});
pose('SWEEP_CUT',{shield:[.45,.4,0],frameP:[0,-.95,.35],frameR:[.08,-.15,.02],torso:[.18,-.25,.04],head:[-.05,.25,0],
 [R]:[-1.35,-.35,.35],[RF]:[-.15,0,0],[RW]:[0,-.25,0],sword:[1.1,0,0],[L]:[-.45,.25,-.55],[LF]:[-.75,0,0],wings:[.45,.2,0],
 feet:{left:[-1.15,1.45],right:[1.15,-1.05]}});
pose('SWEEP_END',{shield:[.3,.2,0],frameP:[0,-1.05,.55],frameR:[.12,-.65,.06],torso:[.22,-.9,.1],head:[-.1,.95,-.05],
 [R]:[-1.2,-1.25,-.35],[RF]:[-.12,0,0],[RW]:[0,-.35,0],sword:[1.15,-.25,0],[L]:[-.2,.35,-.75],[LF]:[-.55,0,0],wings:[.5,.25,0],
 feet:{left:[-1.15,1.45],right:[1.15,-1.05]}});
pose('SWEEP_FOLLOW',{shield:[.3,.2,0],frameP:[0,-1.1,.6],frameR:[.14,-.78,.07],torso:[.25,-1.05,.12],head:[-.12,1.05,-.05],
 [R]:[-1.05,-1.45,-.45],[RF]:[-.1,0,0],[RW]:[0,-.4,0],sword:[1.2,-.3,0],[L]:[-.15,.4,-.8],[LF]:[-.5,0,0],wings:[.45,.25,0],
 feet:{left:[-1.15,1.45],right:[1.15,-1.05]}});

// ---- overhead: rise and raise the blade behind the crown, crash down into a lunge.
pose('OVER_GATHER',{shield:[.8,.4,0],frameP:[0,-.6,-.15],frameR:[-.04,.25,0],torso:[-.05,.3,0],head:[-.05,-.3,0],
 [R]:[-1.6,.15,.25],[RF]:[-1.1,0,0],sword:[.3,0,0],[L]:[-1.1,.1,-.2],[LF]:[-1.1,.1,.3],wings:[.2,0,0],
 feet:{left:[-1,1.3],right:[1,-1]}});
pose('OVER_RAISE',{shield:[.85,.25,-.2],frameP:[0,-.05,-.35],frameR:[-.16,.2,0],torso:[-.28,.2,-.04],head:[.08,-.2,0],
 [R]:[-2.85,.1,.15],[RF]:[-1.35,0,0],[RW]:[.2,0,0],sword:[.15,0,0],[L]:[-1.45,-.2,-.25],[LF]:[-.75,0,.2],wings:[.55,.05,0],
 feet:{left:[-1.05,1.55],right:[1.05,-1.15]}});
pose('OVER_CUT',{shield:[.5,.2,0],frameP:[0,-.9,.45],frameR:[.2,0,0],torso:[.4,0,0],head:[-.25,0,0],
 [R]:[-1.5,0,.12],[RF]:[-.2,0,0],[RW]:[-.1,0,0],sword:[.65,0,0],[L]:[-.4,.2,-.5],[LF]:[-.9,0,0],wings:[.65,.25,0],
 feet:{left:[-1.05,1.55],right:[1.05,-1.15]}});
pose('OVER_END',{shield:[.35,.3,0],frameP:[0,-1.35,.75],frameR:[.32,-.05,0],torso:[.55,-.05,.02],head:[-.42,0,0],
 [R]:[-.75,-.05,.1],[RF]:[-.05,0,0],[RW]:[-.1,0,0],sword:[1.05,0,0],[L]:[-.1,.3,-.75],[LF]:[-.6,0,0],wings:[.55,.35,0],
 feet:{left:[-1.05,1.55],right:[1.05,-1.15]}});

// ---- boost dash: iai crouch with the blade trailing, wings flared; slash through, skid to a stop.
pose('DASH_COIL',{shield:[.9,.55,-.15],frameP:[0,-1.25,-.35],frameR:[.28,.55,-.05],torso:[.35,.75,-.1],head:[-.35,-.85,.05],
 [R]:[.35,.9,.7],[RF]:[-.3,0,0],[RW]:[0,.25,0],sword:[.9,.3,0],[L]:[-1.35,-.25,-.15],[LF]:[-.9,0,.35],wings:[.85,.35,0],thrusters:[.25,0,0],
 feet:{left:[-1.15,1.6],right:[1.1,-1.55]}});
pose('DASH_RUN',{shield:[.95,.15,-.35],frameP:[0,-.75,.25],frameR:[.62,.35,-.05],torso:[.3,.45,-.06],head:[-.75,-.5,0],
 [R]:[.75,.55,.55],[RF]:[-.25,0,0],[RW]:[0,.2,0],sword:[1.35,.2,0],[L]:[-1.5,-.2,-.2],[LF]:[-.8,0,.3],wings:[1.05,.6,0],thrusters:[.05,0,0],
 legs:{left:[-.95,1.55,1.1,.5],right:[1,1.05,-2.1,.75]}});
pose('DASH_SLASH',{shield:[.4,.3,0],frameP:[0,-1.05,.6],frameR:[.3,-.55,.05],torso:[.28,-.85,.1],head:[-.3,.8,-.05],
 [R]:[-1.3,-1.3,-.3],[RF]:[-.1,0,0],[RW]:[0,-.35,0],sword:[1.15,-.25,0],[L]:[-.3,.4,-.8],[LF]:[-.55,0,0],wings:[.95,.45,0],thrusters:[.25,0,0],
 legs:{left:[-1.1,.55,1.6,.1],right:[1.1,.9,-1.6,.5]}});
pose('DASH_SKID',{shield:[.4,.3,0],frameP:[0,-1.35,.2],frameR:[.12,-.45,.04],torso:[.18,-.7,.08],head:[-.15,.7,0],
 [R]:[-1.4,-.8,.95],[RF]:[-.15,0,0],[RW]:[0,-.3,0],sword:[.9,-.2,0],[L]:[-.6,.25,-.6],[LF]:[-.8,0,.1],wings:[.6,.3,0],thrusters:[.3,0,0],
 feet:{left:[-1.2,1.35],right:[1.2,-1.5]}});

// ---- flight: forward-pitched cruise with trailing legs, wings and pods vectored aft.
pose('FLIGHT_TAKEOFF',{shield:[.6,.3,0],frameP:[0,-.9,0],frameR:[.22,0,0],torso:[.3,0,0],head:[-.25,0,0],
 [R]:[-.2,.3,.6],[RF]:[-.5,0,0],sword:[.7,0,0],[L]:[-.6,0,-.5],[LF]:[-.9,0,.2],wings:[.9,.2,0],thrusters:[.2,0,0],
 legs:{left:[-.95,1.45,.55,.45],right:[.95,1.05,-.45,.35]}});
pose('FLIGHT_CRUISE',{shield:[.75,.15,-.4],frameP:[0,-.1,0],frameR:[.55,0,0],torso:[.22,.1,0],head:[-.6,-.1,0],
 [R]:[.35,.55,.55],[RF]:[-.35,0,0],sword:[-.25,.2,0],[L]:[-1.1,-.1,-.35],[LF]:[-1,0,.35],wings:[1.15,.65,0],thrusters:[.1,0,0],
 legs:{left:[-.85,1.9,-1.55,.9],right:[.95,.75,-.6,.55]}});
pose('FLIGHT_HOVER',{shield:[.7,.3,-.1],frameP:[0,-.2,0],frameR:[.12,0,0],torso:[.1,.05,0],head:[-.18,0,0],
 [R]:[-.25,.3,.55],[RF]:[-.45,0,0],sword:[.65,.1,0],[L]:[-.85,0,-.4],[LF]:[-.95,0,.3],wings:[.95,.25,0],thrusters:[.15,0,0],
 legs:{left:[-.9,1.1,.55,.35],right:[.95,.55,-.25,.3]}});

// ---- shield guard: braced lunge, shield squared to the threat, blade drawn back for the counter.
pose('GUARD',{shield:[1,0,0],frameP:[0,-.95,.05],frameR:[.08,.45,0],torso:[.12,.35,0],head:[-.06,-.75,0],
 [R]:[.25,.6,.55],[RF]:[-1.1,0,0],[RW]:[0,.2,0],sword:[.2,.2,0],[L]:[-1.35,.2,.15],[LF]:[-.55,0,.6],wings:[.4,.1,0],
 feet:{left:[-1.15,1.45],right:[1.2,-1.15]}});

// ---- defeat: staggered by the final hit, drop to the knees, topple forward.
pose('DEATH_HIT',{shield:[.2,0,0],frameP:[0,-.55,-.55],frameR:[-.22,.3,.12],torso:[-.38,.45,.16],head:[-.45,.35,0],
 [R]:[-.55,.6,1.35],[RF]:[-.25,0,0],sword:[1.2,.2,0],[L]:[-.2,-.3,-1.05],[LF]:[-.4,0,0],wings:[.7,.3,0]});
pose('DEATH_KNEEL',{shield:[0,0,0],frameP:[0,-2.15,.15],frameR:[.32,.2,.12],torso:[.62,.12,.14],head:[.55,.05,.12],
 [R]:[.12,0,.45],[RF]:[-.2,0,0],sword:[1.45,0,0],[L]:[.05,0,-.35],[LF]:[-.3,0,0],wings:[.15,0,0]});
pose('DEATH_FALL',{shield:[0,0,0],frameP:[0,-2.55,.9],frameR:[.78,.18,.18],torso:[.72,.05,.16],head:[.6,0,.1],
 [R]:[-.55,0,.55],[RF]:[-.1,0,0],sword:[1.5,0,0],[L]:[-.45,0,-.55],[LF]:[-.2,0,0],wings:[.05,0,0]});

pose('STUN',{shield:[0,0,0],frameP:[0,-1.2,-.2],frameR:[.15,0,.1],torso:[.42,.15,.12],head:[.35,.2,.15],
 [R]:[.2,0,.45],[RF]:[-.25,0,0],sword:[1.2,0,0],[L]:[.1,0,-.4],[LF]:[-.35,0,0],wings:[0,0,0],
 feet:{left:[-1,.4],right:[1,-.3]}});

// Fill missing channels from READY so every pose blends completely.
for(const p of Object.values(POSES)){if(p===READY)continue;for(const c of CHANNELS)if(!p[c])p[c]=READY[c];if(!p.feet&&!p.legs)p.feet=READY.feet;}

const smooth=t=>t*t*(3-2*t);
export const EASE={smooth,linear:t=>t,in:t=>t*t*t,out:t=>1-(1-t)**3,snap:t=>1-(1-t)**5,inout:t=>t<.5?4*t*t*t:1-(-2*t+2)**3/2,hold:()=>0};
const lerp=(a,b,t)=>a+(b-a)*t;
// out may be a; legs (gliding leg targets [x,y,z,toePitch]) take whichever side defines them.
export function blend(a,b,t,out={}){
 const la=a.legs,lb=b.legs,fa=a.feet,fb=b.feet;
 for(const c of CHANNELS){const x=a[c]||ZERO,y=b[c]||ZERO,o=out[c]||(out[c]=[0,0,0]);o[0]=lerp(x[0],y[0],t);o[1]=lerp(x[1],y[1],t);o[2]=lerp(x[2],y[2],t);}
 out.feet=(t<.5?fa:fb)||fa||fb||READY.feet;
 if(la||lb){const legs=out.legs&&out.legs!==la&&out.legs!==lb?out.legs:{};for(const side of['left','right']){const x=(la||lb)[side],y=(lb||la)[side];legs[side]=x.map((v,i)=>lerp(v,y[i],t));}out.legs=legs;out.glide=la&&lb?1:la?1-t:t;}
 else{out.legs=null;out.glide=0;}
 return out;
}
// keys: [[time, pose, ease], ...] in seconds; ease names the curve into that key.
export function track(keys,time,out){
 if(time<=keys[0][0])return blend(keys[0][1],keys[0][1],0,out);
 for(let i=1;i<keys.length;i++){const [t1,p1,ease]=keys[i];if(time<t1){const [t0,p0]=keys[i-1];return blend(p0,p1,(EASE[ease]||smooth)(Math.min(1,Math.max(0,(time-t0)/(t1-t0)))),out);}}
 const last=keys[keys.length-1][1];return blend(last,last,0,out);
}
// Sword timelines keyed to the controller's windup/swing/recovery seconds (W, S, Rc).
export function sweepKeys(W,S,Rc){const P=POSES;return[[0,READY],[W*.28,P.SWEEP_GATHER,'out'],[W*.86,P.SWEEP_COIL,'inout'],[W,P.SWEEP_COIL,'smooth'],[W+S*.42,P.SWEEP_CUT,'in'],[W+S,P.SWEEP_END,'out'],[W+S+.14,P.SWEEP_FOLLOW,'out'],[W+S+Rc*.48,P.SWEEP_FOLLOW,'linear'],[W+S+Rc,READY,'inout']];}
export const DEATH_KEYS=[[0,READY],[.18,POSES.DEATH_HIT,'out'],[.55,POSES.DEATH_KNEEL,'inout'],[1,POSES.DEATH_FALL,'in']];
export function overheadKeys(W,S,Rc){const P=POSES;return[[0,READY],[W*.25,P.OVER_GATHER,'out'],[W*.88,P.OVER_RAISE,'inout'],[W,P.OVER_RAISE,'smooth'],[W+S*.45,P.OVER_CUT,'in'],[W+S,P.OVER_END,'snap'],[W+S+Rc*.5,P.OVER_END,'linear'],[W+S+Rc,READY,'inout']];}
