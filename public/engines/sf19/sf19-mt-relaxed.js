var ChessiroStockfishFactory=(()=>{var _scriptName=globalThis.document?.currentScript?.src;return async function(moduleArg={}){var moduleRtn;var h=moduleArg,aa=!!globalThis.window,k=!!globalThis.WorkerGlobalScope,l=globalThis.process?.versions?.node&&"renderer"!=globalThis.process?.type,m=k&&self.name?.startsWith("em-pthread");if(l){var t=require("node:worker_threads");global.Worker=t.Worker;m=(k=!t.va)&&"em-pthread"==t.workerData}h.print=function(a){h.listener?h.listener(a):console.log(a)};h.printErr=function(a){h.listener?h.listener(a):console.error(a)};h.terminate=function(){"undefined"!==typeof u&&u.terminateAllThreads&&u.terminateAllThreads()};
var ba=[],v="./this.program",w=(a,b)=>{throw b;};"undefined"!=typeof __filename?_scriptName=__filename:k&&(_scriptName=self.location.href);var x="",y,z;
if(l){var fs=require("node:fs");x=__dirname+"/";z=a=>{a=ca(a)?new URL(a):a;return fs.readFileSync(a)};y=async a=>{a=ca(a)?new URL(a):a;return fs.readFileSync(a,void 0)};1<process.argv.length&&(v=process.argv[1].replace(/\\/g,"/"));ba=process.argv.slice(2);w=(a,b)=>{process.exitCode=a;throw b;}}else if(aa||k){try{x=(new URL(".",_scriptName)).href}catch{}l||(k&&(z=a=>{var b=new XMLHttpRequest;b.open("GET",a,!1);b.responseType="arraybuffer";b.send(null);return new Uint8Array(b.response)}),y=async a=>
{a=await fetch(a,{credentials:"same-origin"});if(a.ok)return a.arrayBuffer();throw Error(a.status+" : "+a.url);})}var da=console.log.bind(console),ea=console.error.bind(console);if(l){var fa=require("node:util"),ha=a=>"object"==typeof a?fa.inspect(a):a;da=(...a)=>fs.writeSync(1,a.map(ha).join(" ")+"\n");ea=(...a)=>fs.writeSync(2,a.map(ha).join(" ")+"\n")}var A=da,B=ea,C,D,E=!1,F,ca=a=>a.startsWith("file://");function G(){H.buffer!=I.buffer&&J()}var ia,ja;
if(l&&m){globalThis.self=globalThis;var ka=t.parentPort;globalThis.postMessage||(ka.on("message",a=>globalThis.onmessage?.({data:a})),globalThis.postMessage=a=>ka.postMessage(a));process.on("uncaughtException",a=>{postMessage({Y:"uncaughtException",error:a});process.exit(1)})}var la;
if(m){var ma=!1;self.onunhandledrejection=b=>{throw b.reason||b;};function a(b){try{var c=b.data,d=c.Y;if("load"===d){let f=[];self.onmessage=e=>f.push(e);la=()=>{postMessage({Y:"loaded"});for(let e of f)a(e);self.onmessage=a};for(const e of c.ka)if(!h[e]||h[e].proxy)h[e]=(...g)=>{postMessage({Y:"callHandler",ja:e,args:g})},"print"==e&&(A=h[e]),"printErr"==e&&(B=h[e]);H=c.qa;J();D=c.ra;pa();qa()}else if("run"===d){ra(c.Z);ta(c.Z,0,0,1,0,0);ua();va(c.Z);ma||=!0;try{wa(c.na,c.ea)}catch(f){if("unwind"!=
f)throw f;}}else"setimmediate"!==c.target&&("checkMailbox"===d?ma&&K():d&&(B(`worker: received unknown command ${d}`),B(c)))}catch(f){throw xa(),f;}}self.onmessage=a}var I,L,M,N,O,P,ya=!1;function J(){var a=H.buffer;I=new Int8Array(a);new Int16Array(a);L=new Uint8Array(a);new Uint16Array(a);M=new Int32Array(a);N=new Uint32Array(a);new Float32Array(a);O=new Float64Array(a);P=new BigInt64Array(a);new BigUint64Array(a)}function za(){ya=!0;m?la():Q.F()}
function Aa(a){h.onAbort?.(a);a="Aborted("+a+")";B(a);E=!0;a=new WebAssembly.RuntimeError(a+". Build with -sASSERTIONS for more info.");ja?.(a);throw a;}var Ba;async function Ca(a){if(!C)try{var b=await y(a);return new Uint8Array(b)}catch{}if(a==Ba&&C)a=new Uint8Array(C);else if(z)a=z(a);else throw"both async and sync fetching of the wasm failed";return a}
async function Da(a,b){try{var c=await Ca(a);return await WebAssembly.instantiate(c,b)}catch(d){B(`failed to asynchronously prepare wasm: ${d}`),Aa(d)}}async function Ea(a){var b=Ba;if(!C&&!l)try{var c=fetch(b,{credentials:"same-origin"});return await WebAssembly.instantiateStreaming(c,a)}catch(d){B(`wasm streaming compile failed: ${d}`),B("falling back to ArrayBuffer instantiation")}return Da(b,a)}
function Fa(){Ga={C:Ha,h:Ia,x:Ja,y:Ka,n:La,l:Ma,B:Na,e:Oa,q:Pa,i:Qa,k:va,g:Ra,r:Sa,s:Ta,D:Ua,E:Va,j:Wa,m:Xa,c:Ya,d:Za,A:$a,o:ab,t:bb,u:cb,b:R,f:db,w:eb,v:fb,z:gb,a:H,p:hb};return{a:Ga}}
async function pa(){function a(d,f){Q=d.exports;u.ga.push(Q.I);d=Q;h._main=d.G;h._chessiro_command=d.H;S=d.J;ib=h.__emscripten_proxy_main=d.K;ta=d.M;xa=d.N;jb=d.O;kb=d.P;lb=d.Q;mb=d.R;nb=d.S;ob=d.T;pb=d.U;T=d.V;U=d.W;qb=d.X;rb=d.L;D=f;return Q}var b=Fa();if(h.instantiateWasm)return new Promise(d=>{h.instantiateWasm(b,(f,e)=>{d(a(f,e))})});if(m){var c=new WebAssembly.Instance(D,Fa());return a(c,D)}Ba??=h.locateFile?h.locateFile("sf19-mt-relaxed.wasm",x):x+"sf19-mt-relaxed.wasm";return function(d){return a(d.instance,
d.module)}(await Ea(b))}class sb{name="ExitStatus";constructor(a){this.message=`Program terminated with exit(${a})`;this.status=a}}
var tb=a=>{a.terminate();a.onmessage=()=>{}},ub=[],vb=a=>{if(0==u.aa.length){var b=_scriptName;h.mainScriptUrlOrBlob&&(b=h.mainScriptUrlOrBlob,"string"!=typeof b&&(b=URL.createObjectURL(b)));b=new Worker(b,{workerData:"em-pthread",name:"em-pthread"});u.aa.push(b);u.la(u.aa[0])}b=u.aa.pop();if(!b)return 6;u.ba.push(b);u.$[a.Z]=b;b.Z=a.Z;var c={Y:"run",na:a.ma,ea:a.ea,Z:a.Z};l&&b.unref();b.postMessage(c,a.ha);return 0},V=0,ab=()=>0<V,W=(a,b,c,...d)=>{var f=16*d.length,e=qb(),g=U(f),n=g>>3,r;for(r of d)"bigint"==
typeof r?((G(),P)[n++]=1n,(G(),P)[n++]=r):((G(),P)[n++]=0n,(G(),O)[n++]=r);a=kb(a,b,f,g,c);T(e);return a};function hb(a){if(m)return W(0,0,1,a);F=a;0<V||(u.oa(),E=!0);w(a,new sb(a))}function wb(a){if(m)return W(1,0,0,a);--V;R(a)}var R=a=>{F=a;if(m)throw wb(a),"unwind";hb(a)};function ua(){u.ga.forEach(a=>a())}
var u={aa:[],ba:[],ga:[],$:{},ta(){},ua(){},oa:()=>{for(var a of u.ba)tb(a);for(a of u.aa)tb(a);u.aa=[];u.ba=[];u.$={}},fa:a=>{var b=a.Z;delete u.$[b];u.aa.push(a);u.ba.splice(u.ba.indexOf(a),1);a.Z=0;l&&a.unref();lb(b)},la:a=>new Promise(b=>{a.onmessage=e=>{var g=e.data;e=g.Y;if(g.da&&g.da!=S()){var n=u.$[g.da];n?n.postMessage(g,g.ha):B(`Internal error! Worker sent a message "${e}" to target pthread ${g.da}, but that thread no longer exists!`)}else if("checkMailbox"===e)K();else if("spawnThread"===
e)vb(g);else if("cleanupThread"===e)xb(()=>{u.fa(u.$[g.pa])});else if("loaded"===e)a.loaded=!0,b(a);else if("setimmediate"===g.target)a.postMessage(g);else if("uncaughtException"===e)a.onerror(g.error);else if("callHandler"===e)h[g.ja](...g.args);else e&&B(`worker sent an unknown command ${e}`)};a.onerror=e=>{B(`${"worker sent an error!"} ${e.filename}:${e.lineno}: ${e.message}`);throw e;};l&&(a.on("message",e=>a.onmessage({data:e})),a.on("error",e=>a.onerror(e)));var c=[],d=["onAbort","print","printErr"],
f;for(f of d)h.propertyIsEnumerable(f)&&c.push(f);a.postMessage({Y:"load",ka:c,qa:H,ra:D})})};function ra(a){var b=(G(),N)[a+52>>2];a=(G(),N)[a+56>>2];pb(b,b-a);T(b)}var yb=[],wa=(a,b)=>{V=0;var c=yb[a];c||(yb[a]=c=rb.get(a));a=c(b);0<V?F=a:mb(a)},H;function zb(a,b,c,d){return m?W(2,0,1,a,b,c,d):Ha(a,b,c,d)}
var Ha=(a,b,c,d)=>{if(!globalThis.SharedArrayBuffer)return 6;var f=[];if(m&&0===f.length)return zb(a,b,c,d);a={ma:c,Z:a,ea:d,ha:f};return m?(a.Y="spawnThread",postMessage(a,f),0):vb(a)},Ab=new TextDecoder,Bb=(a,b)=>{for(var c=b+void 0;a[b]&&!(b>=c);)++b;return b};function Ia(a,b,c){return m?W(3,0,1,a,b,c):0}function Ja(a,b,c){return m?W(4,0,1,a,b,c):0}function Ka(a,b,c,d){if(m)return W(5,0,1,a,b,c,d)}
var La=()=>Aa(""),Ma=a=>{ta(a,!k,1,!aa,3145728,!1);ua()},Cb=a=>{a instanceof sb||"unwind"==a||w(1,a)},xb=a=>{if(!E)try{return a()}catch(b){Cb(b)}finally{if(!(0<V))try{m?S()&&mb(F):R(F)}catch(b){Cb(b)}}},Db=!Atomics.waitAsync||globalThis.sa||globalThis.navigator?.userAgent&&91>Number((navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)||[])[2]),va=a=>{Db||(Atomics.waitAsync((G(),M),a>>2,a).value.then(K),a+=128,Atomics.store((G(),M),a>>2,1))},K=()=>xb(()=>{var a=S();a&&(va(a),ob())}),Na=(a,b)=>{a==
b?setTimeout(K):m?postMessage({da:a,Y:"checkMailbox"}):(a=u.$[a])&&a.postMessage({Y:"checkMailbox"})},Eb=[],Oa=(a,b,c,d,f,e,g)=>{Eb.length=0;var n=f>>3;for(d=f+d>>3;n<d;){var r;(G(),P)[n++]?r=(G(),P)[n++]:r=(G(),O)[n++];Eb.push(r)}a=b?Fb[b]:Gb[a];u.ia=c;c=a(...Eb);u.ia=0;if(e)c.then(p=>jb(e,g,p));else return c},Pa=()=>{V=0},Qa=a=>{m?postMessage({Y:"cleanupThread",pa:a}):u.fa(u.$[a])},Ra=a=>{l&&u.$[a].ref()},X={},Ya=()=>performance.timeOrigin+performance.now();
function Sa(a,b){if(m)return W(6,0,1,a,b);X[a]&&(clearTimeout(X[a].id),delete X[a]);if(!b)return 0;var c=setTimeout(()=>{delete X[a];xb(()=>nb(a,performance.timeOrigin+performance.now()))},b);X[a]={id:c,wa:b};return 0}
var Y=(a,b,c)=>{var d=(G(),L);if(0<c){var f=b;c=b+c-1;for(var e=0;e<a.length;++e){var g=a.codePointAt(e);if(127>=g){if(b>=c)break;d[b++]=g}else if(2047>=g){if(b+1>=c)break;d[b++]=192|g>>6;d[b++]=128|g&63}else if(65535>=g){if(b+2>=c)break;d[b++]=224|g>>12;d[b++]=128|g>>6&63;d[b++]=128|g&63}else{if(b+3>=c)break;d[b++]=240|g>>18;d[b++]=128|g>>12&63;d[b++]=128|g>>6&63;d[b++]=128|g&63;e++}}d[b]=0;a=b-f}else a=0;return a},Ta=(a,b,c,d)=>{var f=(new Date).getFullYear(),e=(new Date(f,0,1)).getTimezoneOffset();
f=(new Date(f,6,1)).getTimezoneOffset();var g=Math.max(e,f);(G(),N)[a>>2]=60*g;(G(),M)[b>>2]=Number(e!=f);b=n=>{var r=Math.abs(n);return`UTC${0<=n?"-":"+"}${String(Math.floor(r/60)).padStart(2,"0")}${String(r%60).padStart(2,"0")}`};a=b(e);b=b(f);f<e?(Y(a,c,17),Y(b,d,17)):(Y(a,d,17),Y(b,c,17))},Hb=1;function Ua(a,b,c){if(!(0<=a&&3>=a))return 28;if(0===a)a=Date.now();else if(Hb)a=performance.timeOrigin+performance.now();else return 52;a=Math.round(1E6*a);(G(),P)[c>>3]=BigInt(a);return 0}
var Z=[],Va=(a,b,c)=>{Z.length=0;for(var d;d=(G(),L)[b++];){var f=105!=d;f&=112!=d;c+=f&&c%8?4:0;Z.push(112==d?(G(),N)[c>>2]:106==d?(G(),P)[c>>3]:105==d?(G(),M)[c>>2]:(G(),O)[c>>3]);c+=f?8:4}return m?W(0,a,0,...Z):Fb[a](...Z)},Wa=()=>{},Xa=()=>{V+=1;throw"unwind";},Za=()=>l?require("node:os").cpus().length:navigator.hardwareConcurrency,$a=a=>{var b=(G(),L).length;a>>>=0;if(a<=b||2147483648<a)return!1;for(var c=1;4>=c;c*=2){var d=b*(1+.2/c);d=Math.min(d,a+100663296);a:{d=(Math.min(2147483648,65536*
Math.ceil(Math.max(a,d)/65536))-H.buffer.byteLength+65535)/65536|0;try{H.grow(d);J();var f=1;break a}catch(e){}f=void 0}if(f)return!0}return!1},Ib={},Kb=()=>{if(!Jb){var a={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",LANG:(globalThis.navigator?.language??"C").replace("-","_")+".UTF-8",_:v||"./this.program"},b;for(b in Ib)void 0===Ib[b]?delete a[b]:a[b]=Ib[b];var c=[];for(b in a)c.push(`${b}=${a[b]}`);Jb=c}return Jb},Jb;
function bb(a,b){if(m)return W(7,0,1,a,b);var c=0,d=0,f;for(f of Kb()){var e=b+c;(G(),N)[a+d>>2]=e;c+=Y(f,e,Infinity)+1;d+=4}return 0}var Lb=a=>{for(var b=0,c=0;c<a.length;++c){var d=a.charCodeAt(c);127>=d?b++:2047>=d?b+=2:55296<=d&&57343>=d?(b+=4,++c):b+=3}return b};function cb(a,b){if(m)return W(8,0,1,a,b);var c=Kb();(G(),N)[a>>2]=c.length;a=0;for(var d of c)a+=Lb(d)+1;(G(),N)[b>>2]=a;return 0}function db(a){return m?W(9,0,1,a):52}function eb(a,b,c,d){return m?W(10,0,1,a,b,c,d):52}
function fb(a,b,c,d){return m?W(11,0,1,a,b,c,d):70}var Mb=[null,[],[]];function gb(a,b,c,d){if(m)return W(12,0,1,a,b,c,d);for(var f=0,e=0;e<c;e++){var g=(G(),N)[b>>2],n=(G(),N)[b+4>>2];b+=8;for(var r=0;r<n;r++){var p=a,q=(G(),L)[g+r],na=Mb[p];if(0===q||10===q){p=1===p?A:B;q=na;var oa=Bb(q,0);q=Ab.decode(q.buffer?q.buffer instanceof ArrayBuffer?q.subarray(0,oa):q.slice(0,oa):new Uint8Array(q.slice(0,oa)));p(q);na.length=0}else na.push(q)}f+=n}(G(),N)[d>>2]=f;return 0}
var Nb=a=>{var b=Lb(a)+1,c=U(b);Y(a,c,b);return c};m||(H=new WebAssembly.Memory({initial:1024,maximum:32768,shared:!0}),J());h.print&&(A=h.print);h.printErr&&(B=h.printErr);h.wasmBinary&&(C=h.wasmBinary);
h.ccall=(a,b,c,d)=>{var f={string:p=>{var q=0;null!==p&&void 0!==p&&0!==p&&(q=Nb(p));return q},array:p=>{var q=U(p.length);(G(),I).set(p,q);return q}};a=h["_"+a];var e=[],g=0;if(d)for(var n=0;n<d.length;n++){var r=f[c[n]];r?(0===g&&(g=qb()),e[n]=r(d[n])):e[n]=d[n]}c=a(...e);return c=function(p){0!==g&&T(g);if("string"===b)if(p){var q=Bb((G(),L),p);p=Ab.decode((G(),L).slice(p,q))}else p="";else p="boolean"===b?!!p:p;return p}(c)};
var Gb=[hb,wb,zb,Ia,Ja,Ka,Sa,bb,cb,db,eb,fb,gb],Fb={1221808:()=>{if(h.onQuit)h.onQuit()}},S,ib,ta,xa,jb,kb,lb,mb,nb,ob,pb,T,U,qb,rb,Ga;function Ob(a=[]){var b=ib;V+=1;a.unshift(v);var c=a.length,d=U(4*(c+1)),f=d,e;for(e of a)(G(),N)[f>>2]=Nb(e),f+=4;(G(),N)[f>>2]=0;try{var g=b(c,d);R(g,!0)}catch(n){Cb(n)}}function qa(){var a=ba;if(m)ia?.(h),za();else{for(var b=ub;0<b.length;)b.shift()(h);h.calledRun=!0;E||(za(),ia?.(h),Ob(a))}}var Q;m||(Q=await (pa()),qa());
ya?moduleRtn=h:moduleRtn=new Promise((a,b)=>{ia=a;ja=b});
;return moduleRtn}})();if(typeof exports==="object"&&typeof module==="object"){module.exports=ChessiroStockfishFactory;module.exports.default=ChessiroStockfishFactory}else if(typeof define==="function"&&define["amd"])define([],()=>ChessiroStockfishFactory);var isPthread=globalThis.self?.name?.startsWith("em-pthread");var isNode=globalThis.process?.versions?.node&&globalThis.process?.type!="renderer";if(isNode)isPthread=require("node:worker_threads").workerData==="em-pthread";isPthread&&ChessiroStockfishFactory();
// --extern-post-js: appended after the emscripten module factory (outside it).
//
// Turns the module into a drop-in UCI Worker:
//
//     const engine = new Worker("sf19-st.js");
//     engine.onmessage = (e) => console.log(e.data);   // one UCI line per message
//     engine.postMessage("uci");
//
// Also usable as a Node CLI (`node sf19-st.js`) or as a module
// (`require("./sf19-st.js")` returns the emscripten factory).
//
// The factory name is injected at build time via -sEXPORT_NAME=ChessiroStockfishFactory.

(function () {
    "use strict";

    var factory = ChessiroStockfishFactory;
    var isNode = typeof process === "object" && !!(process.versions && process.versions.node)
        && !(typeof window !== "undefined" && typeof window.document !== "undefined");

    // emscripten re-loads this very script inside every pthread Web Worker; the
    // module factory has already been invoked for those (see the generated code
    // above). Nothing else must run there.
    var isPthread = typeof self !== "undefined" && self.name && String(self.name).indexOf("em-pthread") === 0;
    if (isNode) {
        try { isPthread = require("node:worker_threads").workerData === "em-pthread"; } catch (e) {}
    }
    if (isPthread) return;

    var isWebWorker = !isNode && typeof self !== "undefined" && typeof importScripts === "function"
        && typeof WorkerGlobalScope !== "undefined";

    // Commands that are safe to deliver while a search is running. Everything
    // else is queued until the engine prints 'bestmove' (like a well-behaved GUI).
    var PASSTHROUGH = /^(stop|ponderhit|isready|quit|uci|d)\b/;

    function createEngine(opts) {
        var Module = {
            locateFile: opts.locateFile,
            listener: function (line) {
                if (/^bestmove\b/.test(line)) onSearchDone();
                opts.onLine(line);
            }
        };
        if (opts.instantiateWasm) Module.instantiateWasm = opts.instantiateWasm;
        if (opts.wasmBinary) Module.wasmBinary = opts.wasmBinary;

        var instance = null;
        var ready = false;
        var searching = false;     // a 'go' is in flight (cleared by the 'bestmove' line)
        var inflight = false;      // single-threaded: an async call has not returned yet
        var startup = [];          // commands received before the module was ready
        var queue = [];            // commands deferred while busy
        var singleThreaded = false;

        function isBusy() { return searching || inflight; }

        function send(cmd) {
            var isGo = /^go\b/.test(cmd) && !/^go\s+perft\b/.test(cmd);
            var isLong = isGo || /^(bench|speedtest)\b/.test(cmd);
            if (isGo) searching = true;
            if (singleThreaded && isLong) {
                // The whole search runs inside this call, yielding to the event
                // loop periodically; the promise resolves when it returns.
                inflight = true;
                instance.ccall("chessiro_command", null, ["string"], [cmd], { async: true })
                    .then(function () { inflight = false; searching = false; onIdle(); },
                          function (e) {
                              inflight = false; searching = false;
                              opts.onLine("info string ERROR: " + (e && e.message ? e.message : e));
                              onIdle();
                          });
            } else {
                instance.ccall("chessiro_command", null, ["string"], [cmd]);
            }
            if (cmd === "quit") {
                // Single-threaded: the call above already processed it. Multi-threaded:
                // the UCI thread still has to drain the queue; it calls Module.onQuit
                // when done (with a safety timeout).
                if (singleThreaded) finishQuit();
                else quitTimer = setTimeout(finishQuit, 10000);
            }
        }

        var quitTimer = null, quitDone = false;
        function finishQuit() {
            if (quitDone) return;
            quitDone = true;
            if (quitTimer) clearTimeout(quitTimer);
            if (typeof instance["_chessiro_flush_profile"] === "function") instance["_chessiro_flush_profile"]();
            try { instance.terminate(); } catch (e) {}
            if (opts.onQuit) opts.onQuit();
        }
        Module["onQuit"] = function () { finishQuit(); };

        function flush() {
            while (queue.length && !isBusy()) send(queue.shift());
        }

        function onIdle() {
            // Defer so that the 'bestmove' line is delivered before queued commands run.
            setTimeout(flush, 0);
        }

        function onSearchDone() {
            if (!searching) return;
            searching = false;
            if (!inflight) onIdle();
        }

        function processCommand(cmd) {
            cmd = String(cmd).trim();
            if (!cmd) return;
            if (!ready) { startup.push(cmd); return; }
            if (isBusy() && !PASSTHROUGH.test(cmd)) {
                queue.push(cmd);
                return;
            }
            send(cmd);
        }

        factory(Module).then(function (m) {
            instance = m;
            singleThreaded = typeof m["_chessiro_yield"] !== "undefined" || !!m["$singleThreaded"] || opts.singleThreaded;
            ready = true;
            var pending = startup; startup = [];
            pending.forEach(processCommand);
        }).catch(function (e) {
            opts.onLine("info string ERROR: engine failed to load: " + (e && e.message ? e.message : e));
            setTimeout(function () { throw e; }, 0);
        });

        return { postMessage: processCommand, isBusy: function () { return isBusy() || !ready || queue.length > 0; } };
    }

    if (isWebWorker) {
        var wasmUrl = self.location.href.replace(/\.js(\?.*)?(#.*)?$/, ".wasm");
        var engine = createEngine({
            singleThreaded: false,
            locateFile: function (path) {
                return /\.wasm$/.test(path) ? wasmUrl : path;
            },
            onLine: function (line) { postMessage(line); },
            onQuit: function () { try { self.close(); } catch (e) {} }
        });
        self.onmessage = function (event) {
            engine.postMessage(event.data);
        };
    } else if (isNode && typeof require === "function" && require.main === module) {
        var path = require("path");
        var readline = require("readline");
        var wasmPath = path.join(__dirname, path.basename(__filename, ".js") + ".wasm");
        var eng = createEngine({
            singleThreaded: false,
            locateFile: function (p) { return /\.wasm$/.test(p) ? wasmPath : p; },
            onLine: function (line) { process.stdout.write(line + "\n"); },
            onQuit: function () { setTimeout(function () { process.exit(0); }, 10); }
        });
        readline.createInterface({ input: process.stdin, terminal: false })
            .on("line", function (line) { eng.postMessage(line); })
            .on("close", function () {
                // stdin closed (e.g. piped input): finish outstanding work, then quit.
                (function waitIdle() {
                    if (eng.isBusy()) return setTimeout(waitIdle, 20);
                    eng.postMessage("quit");
                }());
            });
    } else if (isNode) {
        module.exports = factory;
        module.exports.createEngine = createEngine;
    } else if (typeof self !== "undefined") {
        // Main browser thread: expose factory + helper without clobbering globals.
        self["ChessiroStockfish"] = { factory: factory, createEngine: createEngine };
    }
}());
