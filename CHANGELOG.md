## 0.3.0 (2021-08-09)

* Check for both file and full paths of running instances. (#121) ([4d8cc7a](https://github.com/Microsoft/vscode-tye/commit/4d8cc7a)), closes [#121](https://github.com/Microsoft/vscode-tye/issues/121)
* Differentiate service logs by application (#124) ([c5ea639](https://github.com/Microsoft/vscode-tye/commit/c5ea639)), closes [#124](https://github.com/Microsoft/vscode-tye/issues/124)
* Post release update to version and npm version dependency updates. (#122) ([a49a2a9](https://github.com/Microsoft/vscode-tye/commit/a49a2a9)), closes [#122](https://github.com/Microsoft/vscode-tye/issues/122)
* Reduce VSIX size (#123) ([4fa1822](https://github.com/Microsoft/vscode-tye/commit/4fa1822)), closes [#123](https://github.com/Microsoft/vscode-tye/issues/123)
* Refresh Tye applications tree view (#128) ([d3d4035](https://github.com/Microsoft/vscode-tye/commit/d3d4035)), closes [#128](https://github.com/Microsoft/vscode-tye/issues/128)
* Verify dashboard API endpoint (#129) ([4b3b76c](https://github.com/Microsoft/vscode-tye/commit/4b3b76c)), closes [#129](https://github.com/Microsoft/vscode-tye/issues/129)



# Change Log

## v0.2.0 - 6 July 2021

A number of usability enhancements and fixes.

### Fixed

 * The microservice application's debugger is attached when clicking "Attach" button of Dapr application [#118](https://github.com/microsoft/vscode-tye/issues/118)
 * It always auto-debugs again after clicking "Disconnect/Stop" button [#103](https://github.com/microsoft/vscode-tye/issues/103)
 * The microservice node is collapsed and then re-expanded after single click the collapse icon [#106](https://github.com/microsoft/vscode-tye/issues/106)
 * Debug icon should be hidden when no application is running [#69](https://github.com/microsoft/vscode-tye/issues/69)

### Added
 
 * The tooltips are inconsistent between the “microservice" and “frontend" when hovering the mouse over the debug icons [#109](https://github.com/microsoft/vscode-tye/issues/109)
 * Add command to kill Tye application [#24](https://github.com/microsoft/vscode-tye/issues/24)
 * Tye tree view needs automatic refresh [#8](https://github.com/microsoft/vscode-tye/issues/8)
 * Scaffold debug launch configuration and tye-run task with the `watch` mode enabled. [#50](https://github.com/microsoft/vscode-tye/issues/50)
 * tye.yaml is overwritten without prompting to overwrite or create new [#65](https://github.com/microsoft/vscode-tye/issues/65)
 * Validate use with a compatible version of Tye [#64](https://github.com/microsoft/vscode-tye/issues/64)
 * Investigating support for Ctrl+C for tasks [#60](https://github.com/microsoft/vscode-tye/issues/60)
 * Add `tye.yaml` schema settings to extension [#63](https://github.com/microsoft/vscode-tye/issues/63)
 * Tye debug doesnt attach to functions apps [#89](https://github.com/microsoft/vscode-tye/issues/89)

## v0.1.0 - 11 May 2021

Initial preview release.
