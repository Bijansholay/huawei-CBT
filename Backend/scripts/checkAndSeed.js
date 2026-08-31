const { createClient } = require("@supabase/supabase-js");
const config = require("../src/config");

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

const seedLabs = [
  {
    id: "b3b8908d-8a50-4d51-9e75-680486c478a1",
    title: "IP Configuration & Interface Settings",
    description: "Configure direct network connectivity between Router1 and Router2 using IP addresses.",
    difficulty: "easy",
    objective: "Objective:\n1. Drag Router1 and Router2 onto the canvas and connect Router1 (GE0/0/0) to Router2 (GE0/0/0) with a cable.\n2. Configure Router1 GE0/0/0 with IP 192.168.1.1/24.\n3. Configure Router2 GE0/0/0 with IP 192.168.1.2/24.\n4. Change the hostnames to RouterA and RouterB respectively.\n5. Run 'ping 192.168.1.2' from Router1 and verify connection.",
    initial_state: { nodes: [], links: [] },
    target_state: {
      nodes: [
        { name: "Router1", type: "Router" },
        { name: "Router2", type: "Router" }
      ],
      links: [
        { fromNode: "Router1", fromInterface: "GigabitEthernet0/0/0", toNode: "Router2", toInterface: "GigabitEthernet0/0/0" }
      ],
      configs: {
        Router1: {
          hostname: "RouterA",
          interfaces: {
            "GigabitEthernet0/0/0": { ip: "192.168.1.1", mask: "24" }
          }
        },
        Router2: {
          hostname: "RouterB",
          interfaces: {
            "GigabitEthernet0/0/0": { ip: "192.168.1.2", mask: "24" }
          }
        }
      },
      passingScore: 70
    }
  },
  {
    id: "a57dfbe9-2321-4f10-ae4b-74b868bc9123",
    title: "VLAN Setup & Access Interface Assigning",
    description: "Set up VLAN 10 on Switch1 and assign PC1 to access VLAN 10.",
    difficulty: "medium",
    objective: "Objective:\n1. Place Switch1 and PC1 on the canvas.\n2. Connect PC1 (Eth0/0/1) to Switch1 (GE0/0/1).\n3. Create VLAN 10 on Switch1.\n4. Set Switch1 interface GE0/0/1 link-type to access, and default vlan to 10.\n5. Set PC1 IP address to 10.10.10.2/24 with default gateway 10.10.10.1.",
    initial_state: { nodes: [], links: [] },
    target_state: {
      nodes: [
        { name: "Switch1", type: "Switch" },
        { name: "PC1", type: "PC" }
      ],
      links: [
        { fromNode: "PC1", fromInterface: "Ethernet0/0/1", toNode: "Switch1", toInterface: "GigabitEthernet0/0/1" }
      ],
      configs: {
        Switch1: {
          hostname: "Switch1",
          interfaces: {
            "GigabitEthernet0/0/1": { vlan: 10 }
          }
        },
        PC1: {
          hostname: "PC1",
          interfaces: {
            "Ethernet0/0/1": { ip: "10.10.10.2", mask: "24" }
          }
        }
      },
      passingScore: 70
    }
  }
];

async function seed() {
  console.log("Checking Supabase tables connection...");
  try {
    const { data, error } = await supabase.from("labs").select("id");
    if (error) {
      console.error("Error connecting to 'labs' table on Supabase:", error.message);
      console.log("\n[ACTION REQUIRED]: If the tables do not exist, please execute the SQL definition script from Backend/sql/schema.sql in your Supabase SQL editor console first!");
      process.exit(1);
    }

    console.log("'labs' table exists. Seeding data...");
    for (const lab of seedLabs) {
      const { data: existing, error: findErr } = await supabase
        .from("labs")
        .select("id")
        .eq("id", lab.id);
        
      if (existing && existing.length > 0) {
        console.log(`Lab '${lab.title}' is already seeded.`);
        continue;
      }
      
      const { error: insertErr } = await supabase.from("labs").insert(lab);
      if (insertErr) {
        console.error(`Failed to insert lab '${lab.title}':`, insertErr.message);
      } else {
        console.log(`Successfully seeded lab: '${lab.title}'`);
      }
    }
  } catch (err) {
    console.error("Unexpected error:", err.message);
  }
}

seed();
