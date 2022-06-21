# BitBurner Scripts

## hack.js
 * Gather all servers directly connected to `home`, and every server directly connected to that server ... until every server has been found.
 * Check for root access
   * No root -> attack ports with available programs
     * Success -> Nuke -> Payload
     * Failure -> Skip
   * Root -> Payload
 * Payload
   * Attempt to install backdoor
     * Success -> Server is backdoored
     * Failure -> Don't have required API, continue
   * Check for payload currently running
     * Success -> Kill running payload
   * Check for existence of payload
     * Success -> remove file from server
   * SCP payload to server
   * Calculate to get max number of threads
   * Execute payload on target
 * Script Completion
   * Print successfully hacked server
   * Print backdoored servers
   * Print servers requiring manual backdoor

### Usage
 * `./hack.js payload.js`


## payload.js
 * basic hack template from BitBurner