/**
 * Huawei VRP CLI & Topology Simulator Service
 */

// Helper to check if an IP is in a subnet
export function ipInSubnet(ip, subnetIp, mask) {
  const ipNum = ipToLong(ip);
  const subnetNum = ipToLong(subnetIp);
  const maskNum = maskToLong(mask);

  return (ipNum & maskNum) === (subnetNum & maskNum);
}

function ipToLong(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return 0;
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function maskToLong(mask) {
  let maskLen = Number(mask);
  if (!isNaN(maskLen)) {
    if (maskLen < 0 || maskLen > 32) maskLen = 32;
    return maskLen === 0 ? 0 : (~0 << (32 - maskLen)) >>> 0;
  }
  // If in dotted decimal format
  return ipToLong(mask);
}

// Convert mask length (e.g. 24) to dotted decimal (e.g. 255.255.255.0)
export function maskLengthToDotted(length) {
  const len = Number(length);
  if (isNaN(len)) return length;
  const maskLong = len === 0 ? 0 : (~0 << (32 - len)) >>> 0;
  return [
    (maskLong >>> 24) & 255,
    (maskLong >>> 16) & 255,
    (maskLong >>> 8) & 255,
    maskLong & 255
  ].join('.');
}

// Initialize default interfaces for node types
export function createDefaultDeviceState(nodeType, nodeName) {
  const state = {
    hostname: nodeName,
    mode: 'user', // user, system, interface, vlan, ospf, ospf-area
    currentInterface: null,
    currentOspfProcess: null,
    currentOspfArea: null,
    interfaces: {},
    vlans: [1], // Default VLAN is 1
    ospf: {
      processId: null,
      networks: []
    },
    staticRoutes: []
  };

  if (nodeType === 'Router') {
    state.interfaces = {
      'GigabitEthernet0/0/0': { ip: '', mask: '', shutdown: false },
      'GigabitEthernet0/0/1': { ip: '', mask: '', shutdown: false },
      'GigabitEthernet0/0/2': { ip: '', mask: '', shutdown: false }
    };
  } else if (nodeType === 'Switch') {
    state.interfaces = {};
    for (let i = 1; i <= 8; i++) {
      state.interfaces[`GigabitEthernet0/0/${i}`] = {
        shutdown: false,
        vlan: 1,
        linkType: 'access', // access, trunk
        allowedPassVlans: [1]
      };
    }
  } else if (nodeType === 'PC') {
    state.interfaces = {
      'Ethernet0/0/1': { ip: '', mask: '', gateway: '', shutdown: false }
    };
  }

  return state;
}

// Command parser class for VRP
export class VrpTerminalSession {
  constructor(deviceState, deviceType) {
    this.state = JSON.parse(JSON.stringify(deviceState)); // deep copy
    this.deviceType = deviceType; // Router, Switch, PC
    this.commandHistory = [];
  }

  getPrompt() {
    const host = this.state.hostname;
    if (this.deviceType === 'PC') {
      return 'PC>';
    }

    switch (this.state.mode) {
      case 'system':
        return `[${host}]`;
      case 'interface':
        return `[${host}-${this.state.currentInterface}]`;
      case 'vlan':
        return `[${host}-vlan${this.state.currentVlan}]`;
      case 'ospf':
        return `[${host}-ospf-${this.state.currentOspfProcess}]`;
      case 'ospf-area':
        return `[${host}-ospf-${this.state.currentOspfProcess}-area-${this.state.currentOspfArea}]`;
      case 'user':
      default:
        return `<${host}>`;
    }
  }

  execute(commandText) {
    const rawCmd = commandText.trim();
    if (!rawCmd) return { output: '', error: false, prompt: this.getPrompt() };

    this.commandHistory.push(rawCmd);
    const tokens = rawCmd.split(/\s+/);
    const cmdName = tokens[0].toLowerCase();

    // ----------------------------------------------------
    // PC COMMANDS
    // ----------------------------------------------------
    if (this.deviceType === 'PC') {
      if (cmdName === 'ipconfig') {
        // Usage: ipconfig [ip mask gateway]
        if (tokens.length === 1) {
          const eth = this.state.interfaces['Ethernet0/0/1'];
          if (!eth.ip) {
            return {
              output: 'IP Address. . . . . . . . . . . . : 0.0.0.0\nSubnet Mask . . . . . . . . . . . : 0.0.0.0\nDefault Gateway . . . . . . . . . : 0.0.0.0',
              error: false,
              prompt: this.getPrompt()
            };
          }
          return {
            output: `IP Address. . . . . . . . . . . . : ${eth.ip}\nSubnet Mask . . . . . . . . . . . : ${maskLengthToDotted(eth.mask)}\nDefault Gateway . . . . . . . . . : ${eth.gateway}`,
            error: false,
            prompt: this.getPrompt()
          };
        }

        if (tokens.length === 4) {
          const [_, ip, mask, gw] = tokens;
          // Simple validation
          if (!ip.includes('.') || !mask.includes('.')) {
            return { output: 'Error: Invalid parameters.', error: true, prompt: this.getPrompt() };
          }
          this.state.interfaces['Ethernet0/0/1'].ip = ip;
          this.state.interfaces['Ethernet0/0/1'].mask = mask;
          this.state.interfaces['Ethernet0/0/1'].gateway = gw;
          return {
            output: `Configure Ethernet0/0/1 successfully:\nIP: ${ip}\nMask: ${mask}\nGateway: ${gw}`,
            error: false,
            prompt: this.getPrompt()
          };
        }
        return { output: 'Usage: ipconfig ipAddress subnetMask gatewayAddress', error: true, prompt: this.getPrompt() };
      }

      if (cmdName === 'ping') {
        if (tokens.length < 2) return { output: 'Usage: ping destinationIp', error: true, prompt: this.getPrompt() };
        // PC ping initiates routing verification (handled by calling view)
        return {
          output: `__PING_INITIATE__:${tokens[1]}`,
          error: false,
          prompt: this.getPrompt()
        };
      }

      return { output: `Error: Command '${cmdName}' not found.`, error: true, prompt: this.getPrompt() };
    }

    // ----------------------------------------------------
    // ROUTER & SWITCH COMMANDS
    // ----------------------------------------------------

    // 1. QUIT / RETURN (Any mode)
    if (cmdName === 'quit' || cmdName === 'q') {
      switch (this.state.mode) {
        case 'interface':
          this.state.mode = 'system';
          this.state.currentInterface = null;
          break;
        case 'vlan':
          this.state.mode = 'system';
          this.state.currentVlan = null;
          break;
        case 'ospf':
          this.state.mode = 'system';
          this.state.currentOspfProcess = null;
          break;
        case 'ospf-area':
          this.state.mode = 'ospf';
          this.state.currentOspfArea = null;
          break;
        case 'system':
          this.state.mode = 'user';
          break;
        case 'user':
        default:
          return { output: 'Info: Already in user view.', error: false, prompt: this.getPrompt() };
      }
      return { output: '', error: false, prompt: this.getPrompt() };
    }

    if (cmdName === 'return' || cmdName === 'ret') {
      this.state.mode = 'user';
      this.state.currentInterface = null;
      this.state.currentVlan = null;
      this.state.currentOspfProcess = null;
      this.state.currentOspfArea = null;
      return { output: '', error: false, prompt: this.getPrompt() };
    }

    // 2. USER VIEW COMMANDS
    if (this.state.mode === 'user') {
      if (cmdName === 'system-view' || cmdName === 'sys') {
        this.state.mode = 'system';
        return {
          output: 'Enter system view, return user view with Ctrl+Z.',
          error: false,
          prompt: this.getPrompt()
        };
      }

      if (cmdName === 'display' || cmdName === 'dis') {
        const sub = tokens[1]?.toLowerCase();
        if (sub === 'ip' && tokens[2]?.toLowerCase() === 'interface') {
          return this.handleDisplayIpInterface(tokens.slice(3));
        }
        if (sub === 'current-configuration' || sub === 'cur') {
          return this.handleDisplayCurrentConfig();
        }
        if (sub === 'vlan') {
          return this.handleDisplayVlan();
        }
        if (sub === 'ip' && tokens[2]?.toLowerCase() === 'routing-table') {
          return this.handleDisplayIpRoutingTable();
        }
      }

      if (cmdName === 'ping') {
        if (tokens.length < 2) return { output: 'Usage: ping destinationIp', error: true, prompt: this.getPrompt() };
        return {
          output: `__PING_INITIATE__:${tokens[1]}`,
          error: false,
          prompt: this.getPrompt()
        };
      }

      return { output: 'Error: Unrecognized command. Type "sys" to enter config mode.', error: true, prompt: this.getPrompt() };
    }

    // 3. SYSTEM VIEW COMMANDS
    if (this.state.mode === 'system') {
      if (cmdName === 'sysname') {
        if (tokens.length < 2) return { output: 'Error: Please specify host name.', error: true, prompt: this.getPrompt() };
        this.state.hostname = tokens[1];
        return { output: '', error: false, prompt: this.getPrompt() };
      }

      // Enter interface view
      if (cmdName === 'interface' || cmdName === 'int') {
        if (tokens.length < 2) return { output: 'Error: Interface name required.', error: true, prompt: this.getPrompt() };
        
        let intName = tokens.slice(1).join('');
        // Normalize interface abbreviations
        if (intName.toLowerCase().startsWith('g0/0/')) {
          intName = 'GigabitEthernet0/0/' + intName.substring(5);
        } else if (intName.toLowerCase().startsWith('gigabitethernet0/0/')) {
          // Keep it full
        }

        if (!this.state.interfaces[intName]) {
          return { output: 'Error: Interface not found.', error: true, prompt: this.getPrompt() };
        }

        this.state.mode = 'interface';
        this.state.currentInterface = intName;
        return { output: '', error: false, prompt: this.getPrompt() };
      }

      // Enter VLAN view (Switch only)
      if (cmdName === 'vlan' && this.deviceType === 'Switch') {
        const vlanId = Number(tokens[1]);
        if (isNaN(vlanId) || vlanId < 1 || vlanId > 4094) {
          return { output: 'Error: VLAN ID must be between 1 and 4094.', error: true, prompt: this.getPrompt() };
        }
        if (!this.state.vlans.includes(vlanId)) {
          this.state.vlans.push(vlanId);
          this.state.vlans.sort((a, b) => a - b);
        }
        this.state.mode = 'vlan';
        this.state.currentVlan = vlanId;
        return { output: `Info: VLAN ${vlanId} created / entered.`, error: false, prompt: this.getPrompt() };
      }

      // Enter OSPF view (Router only)
      if (cmdName === 'ospf') {
        const procId = tokens[1] ? Number(tokens[1]) : 1;
        if (isNaN(procId) || procId < 1) {
          return { output: 'Error: Invalid OSPF process ID.', error: true, prompt: this.getPrompt() };
        }
        this.state.ospf.processId = procId;
        this.state.mode = 'ospf';
        this.state.currentOspfProcess = procId;
        return { output: '', error: false, prompt: this.getPrompt() };
      }

      // Static routes
      if (cmdName === 'ip' && tokens[1]?.toLowerCase() === 'route-static') {
        // Usage: ip route-static dest mask nexthop
        if (tokens.length < 5) return { output: 'Usage: ip route-static destination mask next-hop', error: true, prompt: this.getPrompt() };
        const dest = tokens[2];
        const mask = tokens[3];
        const nexthop = tokens[4];
        this.state.staticRoutes = this.state.staticRoutes.filter(r => r.dest !== dest);
        this.state.staticRoutes.push({ dest, mask, nexthop });
        return { output: '', error: false, prompt: this.getPrompt() };
      }

      // Undo static route
      if (cmdName === 'undo' && tokens[1]?.toLowerCase() === 'ip' && tokens[2]?.toLowerCase() === 'route-static') {
        const dest = tokens[3];
        if (!dest) return { output: 'Error: Destination IP required.', error: true, prompt: this.getPrompt() };
        this.state.staticRoutes = this.state.staticRoutes.filter(r => r.dest !== dest);
        return { output: '', error: false, prompt: this.getPrompt() };
      }

      // Display commands in system view
      if (cmdName === 'display' || cmdName === 'dis') {
        const sub = tokens[1]?.toLowerCase();
        if (sub === 'ip' && tokens[2]?.toLowerCase() === 'interface') {
          return this.handleDisplayIpInterface(tokens.slice(3));
        }
        if (sub === 'current-configuration' || sub === 'cur') {
          return this.handleDisplayCurrentConfig();
        }
        if (sub === 'vlan') {
          return this.handleDisplayVlan();
        }
        if (sub === 'ip' && tokens[2]?.toLowerCase() === 'routing-table') {
          return this.handleDisplayIpRoutingTable();
        }
      }
    }

    // 4. INTERFACE VIEW COMMANDS
    if (this.state.mode === 'interface') {
      const activeIntName = this.state.currentInterface;
      const activeInt = this.state.interfaces[activeIntName];

      if (cmdName === 'ip' && tokens[1]?.toLowerCase() === 'address') {
        // Usage: ip address 192.168.1.1 24 or ip address 192.168.1.1 255.255.255.0
        if (tokens.length < 4) return { output: 'Usage: ip address ipAddress subnetMask', error: true, prompt: this.getPrompt() };
        activeInt.ip = tokens[2];
        activeInt.mask = tokens[3];
        return { output: '', error: false, prompt: this.getPrompt() };
      }

      if (cmdName === 'undo' && tokens[1]?.toLowerCase() === 'ip' && tokens[2]?.toLowerCase() === 'address') {
        activeInt.ip = '';
        activeInt.mask = '';
        return { output: '', error: false, prompt: this.getPrompt() };
      }

      if (cmdName === 'shutdown') {
        activeInt.shutdown = true;
        return { output: `Info: Interface ${activeIntName} is shut down.`, error: false, prompt: this.getPrompt() };
      }

      if (cmdName === 'undo' && cmdName === 'shutdown') {
        activeInt.shutdown = false;
        return { output: `Info: Interface ${activeIntName} is up.`, error: false, prompt: this.getPrompt() };
      }

      // Switch port settings
      if (this.deviceType === 'Switch') {
        if (cmdName === 'port' && tokens[1]?.toLowerCase() === 'link-type') {
          // port link-type access/trunk
          const type = tokens[2]?.toLowerCase();
          if (type === 'access' || type === 'trunk') {
            activeInt.linkType = type;
            return { output: '', error: false, prompt: this.getPrompt() };
          }
          return { output: 'Error: link-type must be access or trunk.', error: true, prompt: this.getPrompt() };
        }

        if (cmdName === 'port' && tokens[1]?.toLowerCase() === 'default' && tokens[2]?.toLowerCase() === 'vlan') {
          // port default vlan 10
          const vlanId = Number(tokens[3]);
          if (isNaN(vlanId) || !this.state.vlans.includes(vlanId)) {
            return { output: 'Error: VLAN does not exist.', error: true, prompt: this.getPrompt() };
          }
          activeInt.vlan = vlanId;
          return { output: '', error: false, prompt: this.getPrompt() };
        }

        if (cmdName === 'port' && tokens[1]?.toLowerCase() === 'trunk' && tokens[2]?.toLowerCase() === 'allow-pass' && tokens[3]?.toLowerCase() === 'vlan') {
          // port trunk allow-pass vlan 10 20
          const vlans = tokens.slice(4).map(Number).filter(v => !isNaN(v));
          vlans.forEach(v => {
            if (!activeInt.allowedPassVlans.includes(v)) {
              activeInt.allowedPassVlans.push(v);
            }
          });
          return { output: '', error: false, prompt: this.getPrompt() };
        }
      }

      if (cmdName === 'display' && tokens[1]?.toLowerCase() === 'this') {
        return {
          output: `#\ninterface ${activeIntName}\n` + 
                  (activeInt.ip ? ` ip address ${activeInt.ip} ${activeInt.mask}\n` : '') +
                  (activeInt.shutdown ? ` shutdown\n` : '') +
                  (activeInt.linkType ? ` port link-type ${activeInt.linkType}\n` : '') +
                  (activeInt.vlan && activeInt.vlan !== 1 ? ` port default vlan ${activeInt.vlan}\n` : '') +
                  '#',
          error: false,
          prompt: this.getPrompt()
        };
      }
    }

    // 5. OSPF VIEW COMMANDS
    if (this.state.mode === 'ospf') {
      if (cmdName === 'area') {
        const areaId = tokens[1];
        if (!areaId) return { output: 'Error: Area ID required.', error: true, prompt: this.getPrompt() };
        this.state.mode = 'ospf-area';
        this.state.currentOspfArea = areaId;
        return { output: '', error: false, prompt: this.getPrompt() };
      }
    }

    // 6. OSPF AREA VIEW COMMANDS
    if (this.state.mode === 'ospf-area') {
      if (cmdName === 'network') {
        // Usage: network 192.168.1.0 0.0.0.255
        if (tokens.length < 3) return { output: 'Usage: network ip wildcardMask', error: true, prompt: this.getPrompt() };
        const ip = tokens[1];
        const wildcard = tokens[2];
        const area = this.state.currentOspfArea;
        
        // Remove existing
        this.state.ospf.networks = this.state.ospf.networks.filter(n => !(n.ip === ip && n.wildcard === wildcard));
        this.state.ospf.networks.push({ ip, wildcard, area });
        return { output: '', error: false, prompt: this.getPrompt() };
      }

      if (cmdName === 'undo' && tokens[1]?.toLowerCase() === 'network') {
        const ip = tokens[2];
        const wildcard = tokens[3];
        this.state.ospf.networks = this.state.ospf.networks.filter(n => !(n.ip === ip && n.wildcard === wildcard));
        return { output: '', error: false, prompt: this.getPrompt() };
      }
    }

    // fallback display commands inside views
    if (cmdName === 'display' || cmdName === 'dis') {
      const sub = tokens[1]?.toLowerCase();
      if (sub === 'ip' && tokens[2]?.toLowerCase() === 'interface') {
        return this.handleDisplayIpInterface(tokens.slice(3));
      }
      if (sub === 'current-configuration' || sub === 'cur') {
        return this.handleDisplayCurrentConfig();
      }
      if (sub === 'vlan') {
        return this.handleDisplayVlan();
      }
      if (sub === 'ip' && tokens[2]?.toLowerCase() === 'routing-table') {
        return this.handleDisplayIpRoutingTable();
      }
    }

    return { output: `Error: Unrecognized command or parameters: '${rawCmd}'`, error: true, prompt: this.getPrompt() };
  }

  // CLI View displays
  handleDisplayIpInterface(args) {
    if (args[0]?.toLowerCase() === 'brief' || args[0]?.toLowerCase() === 'br') {
      let output = 'Interface                         IP Address/Mask      Physical   Protocol\n';
      Object.entries(this.state.interfaces).forEach(([name, int]) => {
        const ipStr = int.ip ? `${int.ip}/${int.mask}` : 'unassigned';
        const phys = int.shutdown ? 'down' : 'up';
        const prot = int.shutdown ? 'down' : (int.ip ? 'up' : 'down');
        output += `${name.padEnd(33)} ${ipStr.padEnd(20)} ${phys.padEnd(10)} ${prot}\n`;
      });
      return { output, error: false, prompt: this.getPrompt() };
    }
    return { output: 'Error: Supported command: display ip interface brief', error: true, prompt: this.getPrompt() };
  }

  handleDisplayCurrentConfig() {
    let output = `#\nsysname ${this.state.hostname}\n#\n`;
    if (this.deviceType === 'Switch') {
      output += `vlan batch ${this.state.vlans.filter(v => v !== 1).join(' ')}\n#\n`;
    }
    Object.entries(this.state.interfaces).forEach(([name, int]) => {
      output += `interface ${name}\n`;
      if (int.ip) output += ` ip address ${int.ip} ${int.mask}\n`;
      if (int.shutdown) output += ' shutdown\n';
      if (int.linkType && int.linkType !== 'access') output += ` port link-type ${int.linkType}\n`;
      if (int.vlan && int.vlan !== 1) output += ` port default vlan ${int.vlan}\n`;
      output += '#\n';
    });

    if (this.state.ospf.processId) {
      output += `ospf ${this.state.ospf.processId}\n`;
      // Group OSPF networks by area
      const areas = Array.from(new Set(this.state.ospf.networks.map(n => n.area)));
      areas.forEach(area => {
        output += ` area ${area}\n`;
        this.state.ospf.networks.filter(n => n.area === area).forEach(n => {
          output += `  network ${n.ip} ${n.wildcard}\n`;
        });
      });
      output += '#\n';
    }

    this.state.staticRoutes.forEach(r => {
      output += `ip route-static ${r.dest} ${r.mask} ${r.nexthop}\n`;
    });

    return { output, error: false, prompt: this.getPrompt() };
  }

  handleDisplayVlan() {
    if (this.deviceType !== 'Switch') return { output: 'Error: Supported only on Switch devices.', error: true, prompt: this.getPrompt() };
    let output = 'The total number of VLANs is : ' + this.state.vlans.length + '\n';
    output += 'VLAN ID Type         Status   Ports\n';
    output += '------------------------------------------------------------------------\n';
    this.state.vlans.forEach(v => {
      const ports = Object.entries(this.state.interfaces)
        .filter(([_, int]) => int.vlan === v || (int.linkType === 'trunk' && int.allowedPassVlans.includes(v)))
        .map(([name, _]) => name.replace('GigabitEthernet0/0/', 'GE0/0/'))
        .join(' ');
      output += `${String(v).padEnd(8)} common       enable   ${ports}\n`;
    });
    return { output, error: false, prompt: this.getPrompt() };
  }

  handleDisplayIpRoutingTable() {
    let output = 'Route Flags: R - relay, D - download to fib\n';
    output += '------------------------------------------------------------------------------\n';
    output += 'Routing Tables: Public\n';
    output += '         Destinations : 4        Routes : 4\n\n';
    output += 'Destination/Mask    Proto   Pre  Cost      NextHop         Interface\n\n';

    // Direct interface routes
    Object.entries(this.state.interfaces).forEach(([name, int]) => {
      if (int.ip) {
        output += `${int.ip}/${int.mask}`.padEnd(20) + `Direct  0    0         127.0.0.1       ${name}\n`;
      }
    });

    // Static routes
    this.state.staticRoutes.forEach(r => {
      output += `${r.dest}/${r.mask}`.padEnd(20) + `Static  60   0         ${r.nexthop}   StaticRoute\n`;
    });

    // OSPF routes
    this.state.ospf.networks.forEach(n => {
      output += `${n.ip}/${n.wildcard}`.padEnd(20) + `OSPF    10   1         0.0.0.0         OSPF-Net\n`;
    });

    return { output, error: false, prompt: this.getPrompt() };
  }
}

// ----------------------------------------------------
// NETWORK SIMULATOR & PING PROPAGATION ENGINE
// ----------------------------------------------------
export function simulatePingTrace(startNodeId, destIp, topology, allDeviceStates) {
  const nodes = topology.nodes || [];
  const links = topology.links || [];

  const startNode = nodes.find(n => n.id === startNodeId);
  if (!startNode) return { success: false, path: [], logs: ['Error: Starting node not found.'] };

  const startState = allDeviceStates[startNode.name];
  if (!startState) return { success: false, path: [], logs: ['Error: Node config state missing.'] };

  const logs = [];
  logs.push(`Ping traceroute initiated from ${startNode.name} to ${destIp}...`);

  // Recursively trace path through topology
  const visited = new Set();
  
  function findRoute(currentNode, targetIp, prevIp) {
    if (visited.has(currentNode.id)) {
      logs.push(`Loop detected at ${currentNode.name}.`);
      return null;
    }
    visited.add(currentNode.id);

    const currState = allDeviceStates[currentNode.name];
    if (!currState) return null;

    // Check if target IP matches any of current node's directly configured interfaces
    const localMatch = Object.entries(currState.interfaces).find(([intName, int]) => {
      return int.ip === targetIp && !int.shutdown;
    });

    if (localMatch) {
      logs.push(`Reached destination interface ${localMatch[0]} on device ${currentNode.name}!`);
      return [currentNode.name];
    }

    // Look for matching subnet on direct interfaces (direct route)
    const directSubnetMatch = Object.entries(currState.interfaces).find(([intName, int]) => {
      if (!int.ip || int.shutdown) return false;
      return ipInSubnet(targetIp, int.ip, int.mask);
    });

    if (directSubnetMatch) {
      const matchedIntName = directSubnetMatch[0];
      logs.push(`${currentNode.name}: Destination IP ${targetIp} matches subnet on local interface ${matchedIntName}. Checking link connectivity...`);

      // Find link connected to this interface
      const link = links.find(l => {
        return (l.fromNodeId === currentNode.id && l.fromInterface === matchedIntName) ||
               (l.toNodeId === currentNode.id && l.toInterface === matchedIntName);
      });

      if (!link) {
        logs.push(`${currentNode.name}: No physical connection cable on interface ${matchedIntName}. Packet dropped.`);
        return null;
      }

      const nextNodeId = link.fromNodeId === currentNode.id ? link.toNodeId : link.fromNodeId;
      const nextNode = nodes.find(n => n.id === nextNodeId);
      const nextNodeIntName = link.fromNodeId === currentNode.id ? link.toInterface : link.fromInterface;

      if (!nextNode) return null;
      const nextState = allDeviceStates[nextNode.name];
      const nextInt = nextState?.interfaces[nextNodeIntName];

      if (!nextInt || nextInt.shutdown) {
        logs.push(`Packet sent to ${nextNode.name} via ${nextNodeIntName}, but interface is DOWN/SHUTDOWN.`);
        return null;
      }

      // If it is a direct subnet match, let's verify if the next node's interface actually has the target IP
      if (nextInt.ip === targetIp) {
        logs.push(`Reached destination interface ${nextNodeIntName} on device ${nextNode.name}!`);
        return [currentNode.name, nextNode.name];
      }

      // Check switches: If next node is a switch, it will flood or forward the packet
      if (nextNode.type === 'Switch') {
        logs.push(`Packet entering Switch ${nextNode.name}. Resolving VLAN paths...`);
        
        // Find links on switch matching the VLAN
        const currentVlan = directSubnetMatch[1].vlan || 1;
        const trunkLinks = links.filter(l => {
          if (l.id === link.id) return false; // don't send back
          const isFrom = l.fromNodeId === nextNode.id;
          const isTo = l.toNodeId === nextNode.id;
          if (!isFrom && !isTo) return false;

          const swIntName = isFrom ? l.fromInterface : l.toInterface;
          const swInt = nextState.interfaces[swIntName];
          if (!swInt || swInt.shutdown) return false;

          if (swInt.linkType === 'access') {
            return swInt.vlan === currentVlan;
          } else if (swInt.linkType === 'trunk') {
            return swInt.allowedPassVlans.includes(currentVlan);
          }
          return false;
        });

        // Try tracing through switch outgoing ports
        for (const outLink of trunkLinks) {
          const targetNodeId = outLink.fromNodeId === nextNode.id ? outLink.toNodeId : outLink.fromNodeId;
          const targetNode = nodes.find(n => n.id === targetNodeId);
          if (!targetNode) continue;
          
          const pathRes = findRoute(targetNode, targetIp, null);
          if (pathRes) {
            return [currentNode.name, nextNode.name, ...pathRes];
          }
        }
        return null;
      }

      // If nextNode is another router/PC, check if it has the IP address configured
      if (nextNode.type === 'Router' || nextNode.type === 'PC') {
        const routeResult = findRoute(nextNode, targetIp, nextInt.ip);
        if (routeResult) {
          return [currentNode.name, ...routeResult];
        }
      }
      return null;
    }

    // 2. Not direct subnet, check static routes in router config
    if (currState.staticRoutes && currState.staticRoutes.length > 0) {
      for (const route of currState.staticRoutes) {
        if (ipInSubnet(targetIp, route.dest, route.mask)) {
          logs.push(`${currentNode.name}: Found matching static route to ${route.dest}/${route.mask} via next-hop ${route.nexthop}`);
          
          // Find next node that has this next-hop IP
          const nextNodeMatch = nodes.find(n => {
            const nState = allDeviceStates[n.name];
            if (!nState) return false;
            return Object.values(nState.interfaces).some(i => i.ip === route.nexthop && !i.shutdown);
          });

          if (!nextNodeMatch) {
            logs.push(`${currentNode.name}: Next-hop router with IP ${route.nexthop} is unreachable.`);
            return null;
          }

          const pathRes = findRoute(nextNodeMatch, targetIp, null);
          if (pathRes) {
            return [currentNode.name, ...pathRes];
          }
        }
      }
    }

    // 3. Check OSPF route advertisements
    if (currState.ospf?.networks && currState.ospf.networks.length > 0) {
      // Find OSPF network statements matching destination
      const ospfMatches = currState.ospf.networks.some(net => ipInSubnet(targetIp, net.ip, net.wildcard));
      if (ospfMatches) {
        logs.push(`${currentNode.name}: Route matched OSPF network advertisement area.`);
        
        // Find other nodes in the same OSPF area and subnet
        const ospfNeighbors = nodes.filter(n => {
          if (n.id === currentNode.id) return false;
          const nState = allDeviceStates[n.name];
          if (!nState || !nState.ospf?.processId) return false;
          return nState.ospf.networks.some(net => ipInSubnet(targetIp, net.ip, net.wildcard));
        });

        for (const neighbor of ospfNeighbors) {
          const pathRes = findRoute(neighbor, targetIp, null);
          if (pathRes) {
            return [currentNode.name, ...pathRes];
          }
        }
      }
    }

    // Default route/gateway check for PCs
    if (currentNode.type === 'PC') {
      const eth = currState.interfaces['Ethernet0/0/1'];
      if (eth.gateway) {
        logs.push(`PC ${currentNode.name}: Destination not in direct subnet. Forwarding packet to gateway ${eth.gateway}...`);
        const gatewayNode = nodes.find(n => {
          const nState = allDeviceStates[n.name];
          return nState && Object.values(nState.interfaces).some(i => i.ip === eth.gateway && !i.shutdown);
        });

        if (gatewayNode) {
          const pathRes = findRoute(gatewayNode, targetIp, null);
          if (pathRes) {
            return [currentNode.name, ...pathRes];
          }
        }
      }
    }

    return null;
  }

  const finalPath = findRoute(startNode, destIp, null);
  if (finalPath) {
    logs.push(`Ping trace completed successfully! Path: ${finalPath.join(' -> ')}`);
    return { success: true, path: finalPath, logs };
  } else {
    logs.push(`Ping trace failed. Packet dropped. Host unreachable.`);
    return { success: false, path: [], logs };
  }
}
