import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create team members
  const teamMembers = [
    { name: "Kenneth", color: "#3B82F6" },
    { name: "Shubham", color: "#22C55E" },
    { name: "Bhupendra", color: "#A855F7" },
    { name: "Saahith", color: "#EAB308" },
    { name: "Rishi", color: "#EF4444" },
    { name: "Rithika", color: "#F97316" },
  ];

  for (const member of teamMembers) {
    await prisma.teamMember.upsert({
      where: { name: member.name },
      update: {},
      create: member,
    });
  }

  console.log("Created team members:", teamMembers.map((m) => m.name).join(", "));

  // Create projects
  const projects = [
    { name: "Coactive", color: "#EF4444" },
    { name: "Treeswift", color: "#22C55E" },
    { name: "Preference Model", color: "#3B82F6" },
    { name: "AGI Inc", color: "#8B5CF6" },
    { name: "Figma", color: "#EAB308" },
    { name: "Conde Nast", color: "#A855F7" },
    { name: "Causal Labs", color: "#14B8A6" },
    { name: "Internal/Individual", color: "#6B7280" },
  ];

  for (const project of projects) {
    await prisma.project.upsert({
      where: { name: project.name },
      update: {},
      create: project,
    });
  }

  console.log("Created projects:", projects.map((p) => p.name).join(", "));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
