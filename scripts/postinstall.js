const { readdirSync, copyFileSync, readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');
const { cwd } = require('process');

const gitignoreComment = '# Automatically added by node-executor. If you want to modify this behavior you can remove next line but leave the comment itself';

const copySrcDir = resolve(__dirname, '..', 'project-root'),
    copyTargetDir = cwd();

const filesToCopy = readdirSync(copySrcDir),
    filesToPreserve = readdirSync(copyTargetDir);

const gitignorePath = resolve(copyTargetDir, '.gitignore');

for(const file of filesToCopy){
    if(filesToPreserve.includes(file)) continue;
    copyFileSync(resolve(copySrcDir, file), resolve(copyTargetDir, file));
}

function getGitignoreEntries(){
    try{
        return readFileSync(gitignorePath, 'utf8').split('\n');
    } catch(e){
        return [];
    }
}

function addScriptsExampleToGitignore(){
    const gitignore = getGitignoreEntries();
    const ignoresScriptsExample = gitignore.includes(gitignoreComment);
    if(!ignoresScriptsExample){
        writeFileSync(gitignorePath, '\n' + gitignoreComment + '\n/scripts.example.yml', { flag: 'a' });
    }
}

addScriptsExampleToGitignore();
