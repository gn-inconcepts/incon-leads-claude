import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.lead.findFirst({
    where: { email: "maria.huber@huber-consulting.at" },
  });

  if (existing) {
    console.log("Seed-Lead existiert bereits, skip.");
    return;
  }

  const lead = await prisma.lead.create({
    data: {
      name: "Maria Huber",
      company: "Huber Consulting",
      email: "maria.huber@huber-consulting.at",
      phone: "+43 660 1234567",
      message:
        "Hallo inconcepts-Team, wir suchen Unterstützung bei der Automatisierung unserer Lead-Pipeline. Freue mich auf ein Gespräch.",
      source: "seed",
      status: "RECEIVED",
    },
  });

  console.log("Seed-Lead erstellt:", lead.id);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
