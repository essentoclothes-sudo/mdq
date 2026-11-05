# @josealbertomaquina/mdq — query markdown tables in your shell

`grep` finds lines. `awk` chokes on markdown. **mdq** selects, filters and sorts markdown pipe tables — the format every README, `ledger.md` and GitHub doc already uses.

    cat README.md | mdq --select Package,Version --where License==MIT --sort Version --desc
    mdq --file ledger.md --select Fecha,Ciclo --where Fecha==2026-11-05 --no-pipes
    mdq --file CHANGELOG.md --select Version --sort Version --desc --header

- `--select a,b` columns · `--where col==val` (also `~=` contains, `!=`) · `--sort col [--desc]`
- `--no-pipes` tab output for further awk/cut · `--header` prints header row
- Reads stdin or `--file`. Zero dependencies, Node >= 18. MIT.
