/**
* @param {NS} ns
**/
// connect '${target}'; backdoor
var payloadServers = []
var backdoorServers = []
var failBackdoors = []
export async function main(ns) {
    // get this hostname
    const scriptHost = ns.getHostname();
    // check args
    if (ns.args.length != 1) {
        ns.tprint("Specify a server and payload.");
        return;
    }
    // payload.js or some other script
    var payload = ns.args[0];
    // check if payload script exists on local machine
    if (!ns.ls(scriptHost).find(f => f === payload)) {
        ns.tprint(`Script '${payload}' does not exist. Aborting.`);
        return;
    }
    // get list of local targets
    var targets = ns.scan(scriptHost);
    ns.tprint(`Local targets: '${targets}'`);

    // while loop to scan each target lol
    while (true) {
        var initTargetsLength = targets.length;
        var potentialNewTargets = [];
        // for each target in targets
        for (var i = 0; i < targets.length; i++) {
            // scan it
            var currentTargets = ns.scan(targets[i]);
            // if it's new to potential targets, add it
            for (var j = 0; j < currentTargets.length; j++) {
                var thisTarget = currentTargets[j];
                if (!potentialNewTargets.includes(thisTarget)) {
                    potentialNewTargets.push(thisTarget);
                }
            }
            await ns.sleep(10)
        }
        // for each target in potentially new ones
        for (var i = 0; i < potentialNewTargets.length; i++) {
            var thisTarget = potentialNewTargets[i];
            // if not unique, skip. else add
            if (!targets.includes(thisTarget)) {
                ns.tprint(`[SCRAPE]\tAdded '${thisTarget}' to targets.`);
                targets.push(thisTarget);
            }
        }
        // if length of targets does not change, break
        if (!(targets.length > initTargetsLength)) {
            break;
        }
    }
    // remove home from the list, since we need the RAM...
    const index = targets.indexOf("home")
    if (index > -1) {
        targets.splice(index, 1); // 2nd parameter means remove one item only
    }

    // print what we have
    ns.tprint(`Targets:\n'${targets}'`)

    // for each target in targets
    for (var i = 0; i < targets.length; i++) {
        var target = targets[i];
        ns.tprint(`------------ '${target}' ------------`);
        // check target hack requirement vs current hack level
        var hackLevelDiff = ns.getHackingLevel() - ns.getServerRequiredHackingLevel(target);
        if (hackLevelDiff < 0) {
            ns.tprint(`[INFO]\tNeed '${Math.abs(hackLevelDiff)} more hack levels for '${target}.'`);
            continue;
        }
        // check for root on the target
        if (ns.hasRootAccess(target)) {
            ns.tprint("[INFO]\tAlready have root access; Copying and executing payload...");
            await ns.sleep(200);
            await executePayload(ns, scriptHost, target, payload);
            continue;
        }
        const portOpeners = [
            ns.brutessh,
            ns.ftpcrack,
            ns.relaysmtp,
            ns.httpworm,
            ns.sqlinject
        ]

        const portOpenerNames = [
            "BruteSSH",
            "FTPCrack",
            "RelaySMTP",
            "HTTPWorm",
            "SQLInject"
        ]
        var requiredPorts = ns.getServerNumPortsRequired(target);
        // check number of ports required to open on target
        // and execute each port opener in order if neccessary
        for (var j = 0; j < requiredPorts; j++) {
            try {
                portOpeners[j](target);
                ns.tprint(`[PORTS]\tSUCCESS: Execute '${portOpenerNames[j]}' on '${target}'`);
            } catch {
                ns.tprint(`[PORTS]\tERROR: Execute '${portOpenerNames[j]}' on '${target}'`);
                break;
            }
        }
        // nuke the target
        try {
            ns.nuke(target);
            ns.tprint("[INFO]\tSUCCESS: Nuked target");
        } catch {
            ns.tprint("[INFO]\tERROR: Target not nuked");
            continue;
        }
        ns.tprint("[INFO]\tCopying and executing payload...");
        await ns.sleep(200);
        await executePayload(ns, scriptHost, target, payload);
    }
    ns.tprint('------------------------------------------------------------')
    ns.tprint("Script finished execution!");
    ns.tprint(`Servers successfully hacked: ${payloadServers}`);
    if (backdoorServers.length > 0) {
        ns.tprint(`Servers backdoored: '${backdoorServers}'`);
    }
    if (failBackdoors.length > 0) {
        ns.tprint(`Servers requiring manual backdoor: '${failBackdoors}'`);
    }
}
/**
* @param {NS} ns
**/
async function executePayload(ns, scriptHost, target, payload) {
    // test for backdoor
    if (!ns.getServer(target).backdoorInstalled) {
        try {
            await ns.installBackdoor(target);
            ns.tprint(`[PAYLOAD]\t SUCCESS: Backdoored '${target}'`);
            backdoorServers.push(target);
        } catch {
            ns.tprint(`[PAYLOAD]\tERROR: Manual backdoor required`);
            failBackdoors.push(target);
        }
    } else {
        ns.tprint(`[PAYLOAD]\t'${target}' already backdoored`);
    }
    if (ns.scriptRunning(payload, target)) {
        ns.tprint(`[PAYLOAD]\tKilling current running payload...`)
        ns.killall(target);
        await ns.sleep(1000);
    }
    if (ns.fileExists(payload, target)) {
        ns.tprint(`[PAYLOAD]\tRemoved current payload script`);
        ns.rm(payload, target);
    }
    ns.tprint(`[PAYLOAD]\tCopying ${payload} to server...`);
    await ns.scp(payload, scriptHost, target);
    const threads = Math.floor((ns.getServerMaxRam(target) - ns.getServerUsedRam(target)) / ns.getScriptRam(payload));
    if (threads == 0) {
        ns.tprint(`[PAYLOAD]\tERROR: Can\'t execute '${payload}' on '${target}.' '${threads}' threads are available`);
        return;
    }
    ns.tprint(`[PAYLOAD]\tExecuting ${payload}...`);
    ns.exec(payload, target, threads, target);
    ns.tprint(`[PAYLOAD]\tSUCCESS: Payload executed on '${target} with ${threads}' threads`);
    payloadServers.push(target);
}
