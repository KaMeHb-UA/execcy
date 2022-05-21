async function loadModule(){
    return typeof require === 'undefined' ? import('node-executor') : require('node-executor');
}

void async function(){
    const { context, runCommand } = await loadModule();
    runCommand(context);
}()
