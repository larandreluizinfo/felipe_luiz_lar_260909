# AGENTS

## Regra obrigatória de versionamento

Toda alteração feita neste repositório DEVE ser commitada e pushada.

- Após qualquer edição/criação/remoção de arquivos, execute:
  1. `git add -A`
  2. `git status` (conferir o que será commitado)
  3. `git commit -m "<mensagem clara em pt-BR>"`
  4. `git push origin <branch-atual>` (ex: `main`)
- Nunca deixe alterações apenas locais sem push ao final da tarefa.
- Se o push falhar (ex: remote desatualizado), execute `git pull --rebase origin <branch>` e tente o push novamente.
- Não crie commits vazios. Não use `git push --force` sem autorização explícita do usuário.
