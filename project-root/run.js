async function loadModule(){
    return typeof require === 'undefined' ? import('execy') : require('execy');
}

void async function(){
    const { context, runCommand } = await loadModule();
    runCommand(context);
}()
