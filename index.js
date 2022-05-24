// @ts-check
const { load } = require('js-yaml');
const { resolve } = require('path');
const { cwd, argv, exit, env, stdout, stderr } = require('process');
const { readFileSync } = require('fs');
const { spawn } = require('child_process');
const colorFromString = require('./color');
const EventEmitter = require('events');
const envCtxName = 'EXECY_CTX';
const { [envCtxName]: envCtx } = env;
let isScriptContext = false;
const escape = '\u001b';

function clearCC(str){
    return (str || '')
        .replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
}

function colored(str, color){
    return escape + '[' + color + 'm' + str + escape + '[0m';
}

function color256(str, color){
    return escape + '[38;5;' + color + 'm' + str + escape + '[0m';
}

function getScriptContext(){
    isScriptContext = true;
    const { scripts } = load(readFileSync(resolve(cwd(), 'scripts.yml'), 'utf8'));
    const [,, script ] = argv;
    if(!(script in scripts)){
        console.error('Cannot find script ' + script + ' in scripts.yml, aborting');
        exit(1);
    }
    return scripts[script];
}

function run(cmd, args, options = {}){
    const ee = new EventEmitter();
    /** @type {import('child_process').ChildProcessWithoutNullStreams} */
    // @ts-ignore
    const cp = spawn(cmd, args, Object.assign(options, { stdio: 'pipe' }));
    let done = false, currentStderr = '', currentStdout = '', exitCode, error;
    function onNextStdoutChunk(chunk){
        currentStdout += chunk;
        ee.emit('change');
    }
    function onNextStderrChunk(chunk){
        currentStderr += chunk;
        ee.emit('change');
    }
    function onError(e){
        done = true;
        exitCode = -1;
        error = e;
        ee.emit('change');
    }
    cp.once('error', onError);
    cp.stdout.once('error', onError);
    cp.stderr.once('error', onError);
    cp.stdout.on('data', onNextStdoutChunk);
    cp.stderr.on('data', onNextStderrChunk);
    cp.once('close', code => {
        done = true;
        exitCode = code;
        ee.emit('change');
    });

    return {
        [Symbol.asyncIterator]: () => ({
            next(){
                return new Promise(function promiseExecutor(resolve, reject){
                    if(currentStdout){
                        const lines = currentStdout.split('\n');
                        if(lines.length > 1){
                            const res = lines.shift();
                            currentStdout = lines.join('\n');
                            resolve({
                                done: false,
                                value: [ res, null ],
                            });
                        }
                    } else if(currentStderr){
                        const lines = currentStderr.split('\n');
                        if(lines.length > 1){
                            const res = lines.shift();
                            currentStderr = lines.join('\n');
                            resolve({
                                done: false,
                                value: [ null, res ],
                            });
                        }
                    } else if(done){
                        if(exitCode === -1){
                            reject(error);
                        } else if(exitCode){
                            reject(Object.assign(new Error('Process exited with code ' + exitCode), { code: exitCode }));
                        } else {
                            resolve({
                                done: true,
                                value: undefined,
                            });
                        }
                    } else {
                        ee.once('change', () => promiseExecutor(resolve, reject));
                    }
                });
            }
        })
    }
}

/**
 * Runs command from context
 * 
 * @arg {{
 *  executable: string;
 *  'base-args': readonly string[];
 *  args: readonly string[];
 *  name?: string;
 *  'hide-executable-name'?: boolean;
 *  'log-exit'?: boolean;
 * }} ctx
 */

async function runCommand(ctx){
    const {
        executable,
        'base-args': baseArgs,
        args,
        'hide-executable-name': hideExecutableName,
        name,
    } = ctx;
    const logExit = ctx['log-exit'] === undefined || ctx['log-exit'];
    const serializedCtx = JSON.stringify(ctx);
    const additionalArgs = isScriptContext ? argv.slice(3) : [];
    const printableName = hideExecutableName && name === undefined ? '' : color256(`${name ?? executable} | `, colorFromString(serializedCtx));
    try{
        for await(const [ stdoutText, stderrText ] of run(executable, baseArgs.concat(args, additionalArgs), {
            env: Object.assign({}, env, { [envCtxName]: serializedCtx }),
        })){
            const text = stdoutText || stderrText;
            const formattedText = colored(clearCC(text), stdoutText ? 34 : 31);
            const output = stdoutText ? stdout : stderr;
            await new Promise(r => output.write(`${printableName}${formattedText}\n`, r));
        }
        if(logExit) await new Promise(r => stdout.write(`${printableName}${colored('✅ Process finished successfully', 32)}\n`, r));
    } catch(e){
        if(logExit) await new Promise(r => stderr.write(`${printableName}${colored('❌ ' + e.message, 31)}\n`, r));
        exit(e.code);
    }
}

Object.defineProperty(module.exports, 'context', {
    value: envCtx ? JSON.parse(envCtx) : getScriptContext(),
    configurable: false,
    writable: false,
});

Object.defineProperty(module.exports, 'runCommand', {
    value: runCommand,
    configurable: false,
    writable: false,
});
