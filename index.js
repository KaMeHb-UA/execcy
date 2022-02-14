const { load } = require('js-yaml');
const { resolve } = require('path');
const { cwd, argv, exit, env } = require('process');
const { readFileSync } = require('fs');
const { spawnSync } = require('child_process');
const envCtxName = 'NODE_RUNNER_CTX';
const { [envCtxName]: envCtx } = env;
let isScriptContext = false;

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

function runCommand(ctx){
    const additionalArgs = isScriptContext ? argv.slice(3) : [];
    console.log('Running', ctx);
    const { executable, 'base-args': baseArgs, args } = ctx;
    spawnSync(executable, baseArgs.concat(args, additionalArgs), {
        stdio: 'inherit',
        env: Object.assign({}, env, { [envCtxName]: JSON.stringify(ctx) }),
    });
}
