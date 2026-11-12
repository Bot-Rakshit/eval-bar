var ChessiroStockfishFactory=(()=>{var _scriptName=globalThis.document?.currentScript?.src;return async function(moduleArg={}){var moduleRtn;var f=moduleArg,aa=!!globalThis.window,m=!!globalThis.WorkerGlobalScope,q=globalThis.process?.versions?.node&&"renderer"!=globalThis.process?.type;f.print=function(a){f.listener?f.listener(a):console.log(a)};f.printErr=function(a){f.listener?f.listener(a):console.error(a)};f.terminate=function(){"undefined"!==typeof PThread&&PThread.terminateAllThreads&&PThread.terminateAllThreads()};var r=[],u="./this.program",v=(a,b)=>{throw b;};
"undefined"!=typeof __filename?_scriptName=__filename:m&&(_scriptName=self.location.href);var w="",x,y;
if(q){var fs=require("node:fs");w=__dirname+"/";y=a=>{a=z(a)?new URL(a):a;return fs.readFileSync(a)};x=async a=>{a=z(a)?new URL(a):a;return fs.readFileSync(a,void 0)};1<process.argv.length&&(u=process.argv[1].replace(/\\/g,"/"));r=process.argv.slice(2);v=(a,b)=>{process.exitCode=a;throw b;}}else if(aa||m){try{w=(new URL(".",_scriptName)).href}catch{}m&&(y=a=>{var b=new XMLHttpRequest;b.open("GET",a,!1);b.responseType="arraybuffer";b.send(null);return new Uint8Array(b.response)});x=async a=>{a=await fetch(a,
{credentials:"same-origin"});if(a.ok)return a.arrayBuffer();throw Error(a.status+" : "+a.url);}}var A=console.log.bind(console),B=console.error.bind(console),D,E=!1,z=a=>a.startsWith("file://"),F,ba,ca,G,H,I,da,ea=!1;function fa(){var a=J.buffer;ca=new Int8Array(a);new Int16Array(a);G=new Uint8Array(a);new Uint16Array(a);H=new Int32Array(a);I=new Uint32Array(a);new Float32Array(a);new Float64Array(a);da=new BigInt64Array(a);new BigUint64Array(a)}
function K(a){f.onAbort?.(a);a="Aborted("+a+")";B(a);E=!0;a=new WebAssembly.RuntimeError(a+". Build with -sASSERTIONS for more info.");ba?.(a);throw a;}var L;async function ha(a){if(!D)try{var b=await x(a);return new Uint8Array(b)}catch{}if(a==L&&D)a=new Uint8Array(D);else if(y)a=y(a);else throw"both async and sync fetching of the wasm failed";return a}
async function ia(a,b){try{var c=await ha(a);return await WebAssembly.instantiate(c,b)}catch(d){B(`failed to asynchronously prepare wasm: ${d}`),K(d)}}async function ja(a){var b=L;if(!D&&!q)try{var c=fetch(b,{credentials:"same-origin"});return await WebAssembly.instantiateStreaming(c,a)}catch(d){B(`wasm streaming compile failed: ${d}`),B("falling back to ArrayBuffer instantiation")}return ia(b,a)}
class M{name="ExitStatus";constructor(a){this.message=`Program terminated with exit(${a})`;this.status=a}}
var ka=new TextDecoder,la=(a,b)=>{for(var c=b+void 0;a[b]&&!(b>=c);)++b;return b},N={},O=a=>{if(!E)try{return a()}catch(b){b instanceof M||"unwind"==b||v(1,b)}finally{}},P=(a,b,c)=>{var d=G;if(!(0<c))return 0;var e=b;c=b+c-1;for(var g=0;g<a.length;++g){var h=a.codePointAt(g);if(127>=h){if(b>=c)break;d[b++]=h}else if(2047>=h){if(b+1>=c)break;d[b++]=192|h>>6;d[b++]=128|h&63}else if(65535>=h){if(b+2>=c)break;d[b++]=224|h>>12;d[b++]=128|h>>6&63;d[b++]=128|h&63}else{if(b+3>=c)break;d[b++]=240|h>>18;d[b++]=
128|h>>12&63;d[b++]=128|h>>6&63;d[b++]=128|h&63;g++}}d[b]=0;return b-e},Q={},ma=()=>{if(!R){var a={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",LANG:(globalThis.navigator?.language??"C").replace("-","_")+".UTF-8",_:u||"./this.program"},b;for(b in Q)void 0===Q[b]?delete a[b]:a[b]=Q[b];var c=[];for(b in a)c.push(`${b}=${a[b]}`);R=c}return R},R,na=a=>{for(var b=0,c=0;c<a.length;++c){var d=a.charCodeAt(c);127>=d?b++:2047>=d?b+=2:55296<=d&&57343>=d?(b+=4,++c):b+=3}return b},
oa=[null,[],[]],pa=a=>{var b=na(a)+1,c=S(b);P(a,c,b);return c},T=a=>{try{a()}catch(b){K(b)}};function qa(a){var b=(...c)=>{U.push(a);try{return a(...c)}finally{E||(U.pop(),V&&1===W&&0===U.length&&(W=0,T(ra),"undefined"!=typeof Fibers&&Fibers.I()))}};sa.set(a,b);return b}var W=0,V=null,ta=0,U=[],X=new Map,ua=new Map,sa=new Map,va=0,Y=null,wa=[];function xa(){return new Promise((a,b)=>{Y={resolve:a,reject:b}})}
function ya(){var a=za(8388620),b=a+12;I[a>>2]=b;I[a+4>>2]=b+8388608;b=U[0];if(!X.has(b)){var c=va++;X.set(b,c);ua.set(c,b)}b=X.get(b);H[a+8>>2]=b;return a}function Aa(){var a=ua.get(H[V+8>>2]);a=sa.get(a);return O(a)}
function Ba(a){if(!E){if(0===W){var b=!1,c=!1;a((d=0)=>{if(!E&&(ta=d,b=!0,c)){W=2;T(()=>Ca(V));"undefined"!=typeof MainLoop&&MainLoop.C&&MainLoop.resume();d=!1;try{var e=Aa()}catch(l){e=l,d=!0}var g=!1;if(!V){var h=Y;h&&(Y=null,(d?h.reject:h.resolve)(e),g=!0)}if(d&&!g)throw e;}});c=!0;b||(W=1,V=ya(),"undefined"!=typeof MainLoop&&MainLoop.C&&MainLoop.pause(),T(()=>Da(V)))}else 2===W?(W=0,T(Ea),Fa(V),V=null,wa.forEach(O)):K(`invalid state: ${W}`);return ta}}var Ga=a=>Ba(async b=>{b(await a())});
f.print&&(A=f.print);f.printErr&&(B=f.printErr);f.wasmBinary&&(D=f.wasmBinary);
f.ccall=(a,b,c,d,e)=>{function g(k){0!==t&&Ha(t);return"string"===b?k?ka.decode(G.subarray(k,la(G,k))):"":"boolean"===b?!!k:k}var h={string:k=>{var C=0;null!==k&&void 0!==k&&0!==k&&(C=pa(k));return C},array:k=>{var C=S(k.length);ca.set(k,C);return C}};a=f["_"+a];var l=[],t=0;if(d)for(var n=0;n<d.length;n++){var p=h[c[n]];p?(0===t&&(t=Ia()),l[n]=p(d[n])):l[n]=d[n]}c=V;d=a(...l);e=e?.async;if(V!=c)return xa().then(g);d=g(d);return e?Promise.resolve(d):d};
var Ja,Fa,Ka,za,Ha,S,Ia,dynCall_vii,dynCall_vi,dynCall_iii,dynCall_v,Da,ra,Ca,Ea,J,La={b:function(){return Ga(async()=>{await new Promise(function(a){if("function"===typeof setImmediate&&"object"===typeof process&&process.versions&&process.versions.node)setImmediate(a);else if("function"===typeof MessageChannel){var b=f.$yieldChannel;b||(b=f.$yieldChannel=new MessageChannel,b.port1.onmessage=function(){var c=f.$yieldResolve;f.$yieldResolve=null;c&&c()});f.$yieldResolve=a;b.port2.postMessage(0)}else setTimeout(a,
0)})})},c:function(){return 0},g:function(){return 0},h:function(){},k:()=>K(""),m:()=>{},n:(a,b)=>{N[a]&&(clearTimeout(N[a].id),delete N[a]);if(!b)return 0;var c=setTimeout(()=>{delete N[a];O(()=>Ka(a,performance.now()))},b);N[a]={id:c,F:b};return 0},o:(a,b,c,d)=>{var e=(new Date).getFullYear(),g=(new Date(e,0,1)).getTimezoneOffset();e=(new Date(e,6,1)).getTimezoneOffset();I[a>>2]=60*Math.max(g,e);H[b>>2]=Number(g!=e);b=h=>{var l=Math.abs(h);return`UTC${0<=h?"-":"+"}${String(Math.floor(l/60)).padStart(2,
"0")}${String(l%60).padStart(2,"0")}`};a=b(g);b=b(e);e<g?(P(a,c,17),P(b,d,17)):(P(a,d,17),P(b,c,17))},i:function(a,b,c){if(!(0<=a&&3>=a))return 28;da[c>>3]=BigInt(Math.round(1E6*(0===a?Date.now():performance.now())));return 0},j:a=>{var b=G.length;a>>>=0;if(2147483648<a)return!1;for(var c=1;4>=c;c*=2){var d=b*(1+.2/c);d=Math.min(d,a+100663296);a:{d=(Math.min(2147483648,65536*Math.ceil(Math.max(a,d)/65536))-J.buffer.byteLength+65535)/65536|0;try{J.grow(d);fa();var e=1;break a}catch(g){}e=void 0}if(e)return!0}return!1},
p:(a,b)=>{var c=0,d=0,e;for(e of ma()){var g=b+c;I[a+d>>2]=g;c+=P(e,g,Infinity)+1;d+=4}return 0},q:(a,b)=>{var c=ma();I[a>>2]=c.length;a=0;for(var d of c)a+=na(d)+1;I[b>>2]=a;return 0},a:a=>{v(a,new M(a))},d:()=>52,f:()=>52,r:function(){return 70},e:(a,b,c,d)=>{for(var e=0,g=0;g<c;g++){var h=I[b>>2],l=I[b+4>>2];b+=8;for(var t=0;t<l;t++){var n=a,p=G[h+t],k=oa[n];0===p||10===p?(n=1===n?A:B,p=la(k,0),p=ka.decode(k.buffer?k.subarray(0,p):new Uint8Array(k.slice(0,p))),n(p),k.length=0):k.push(p)}e+=l}I[d>>
2]=e;return 0},l:a=>{v(a,new M(a))}};function Ma(a=[]){var b=Ja;a.unshift(u);var c=a.length,d=S(4*(c+1)),e=d,g;for(g of a)I[e>>2]=pa(g),e+=4;I[e>>2]=0;try{var h=b(c,d);v(h,new M(h))}catch(l){l instanceof M||"unwind"==l||v(1,l)}}var Z;
Z=await (async function(){function a(c){var d=Z=c.exports;c={};for(let [e,g]of Object.entries(d))"function"==typeof g?(d=qa(g),c[e]=d):c[e]=g;c=Z=c;Ja=f._main=c.u;Fa=c.v;f._chessiro_command=c.w;Ka=c.x;za=c.y;Ha=c.z;S=c.A;Ia=c.B;dynCall_vii=c.D;dynCall_vi=c.G;dynCall_iii=c.H;dynCall_v=c.L;Da=c.X;ra=c.Y;Ca=c.Z;Ea=c._;J=c.s;fa();return Z}var b={a:La};if(f.instantiateWasm)return new Promise(c=>{f.instantiateWasm(b,(d,e)=>{c(a(d,e))})});L??=f.locateFile?f.locateFile("sf19-st.wasm",w):w+"sf19-st.wasm";
return a((await ja(b)).instance)}());(function(a=r){f.calledRun=!0;E||(ea=!0,Z.t(),F?.(f),Ma(a))})();ea?moduleRtn=f:moduleRtn=new Promise((a,b)=>{F=a;ba=b});
;return moduleRtn}})();if(typeof exports==="object"&&typeof module==="object"){module.exports=ChessiroStockfishFactory;module.exports.default=ChessiroStockfishFactory}else if(typeof define==="function"&&define["amd"])define([],()=>ChessiroStockfishFactory);
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
            singleThreaded: true,
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
            singleThreaded: true,
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
