async function req(module){
    return typeof require === 'undefined' ? import(module) : require(module);
}

void async function(){
    const { context, runCommand } = await req('node-executor');
    runCommand(context);
}()
