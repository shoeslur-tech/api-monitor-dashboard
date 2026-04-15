const axios = require("axios");
const prisma = require("./prisma");

async function checkMonitor(monitor) {
  const startTime = Date.now();

  let newStatus = "DOWN";
  let responseTimeMs = null;
  let errorMessage = null;

  try {
    await axios.get(monitor.url);
    newStatus = "UP";
    responseTimeMs = Date.now() - startTime;
  } catch (error) {
    newStatus = "DOWN";
    responseTimeMs = Date.now() - startTime;

    if (error.response) {
      errorMessage = `HTTP ${error.response.status}`;
    } else if (error.request) {
      errorMessage = "No response received";
    } else {
      errorMessage = error.message;
    }
  }

  await prisma.monitor.update({
    where: { id: monitor.id },
    data: {
      status: newStatus
    }
  });

  await prisma.check.create({
    data: {
      monitorId: monitor.id,
      status: newStatus,
      responseTimeMs,
      errorMessage
    }
  });

  const oldChecks = await prisma.check.findMany({
    where: { monitorId: monitor.id },
    orderBy: { checkedAt: "desc" },
    skip: 10
  });

  if (oldChecks.length > 0) {
    await prisma.check.deleteMany({
      where: {
        id: {
          in: oldChecks.map((check) => check.id)
        }
      }
    });
  }
}

module.exports = { checkMonitor };