async function loadModule(){
    return typeof require === 'undefined' ? import('execcy') : require('execcy');
}

void async function(){
    const { context, runCommand } = await loadModule();
    await runCommand(context);
}()
