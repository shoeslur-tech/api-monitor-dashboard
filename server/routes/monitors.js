const express = require("express");
const { checkMonitor } = require("../services/monitorService");
const prisma = require("../services/prisma");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const monitors = await prisma.monitor.findMany({
      include: {
        checks: {
          orderBy: {
            checkedAt: "desc"
          },
          take: 10
        }
      },
      orderBy: {
        id: "desc"
      }
    });

    const formattedMonitors = monitors.map((monitor) => ({
      id: monitor.id,
      name: monitor.name,
      url: monitor.url,
      status: monitor.status,
      history: monitor.checks.map((check) => ({
        checkedAt: check.checkedAt,
        status: check.status,
        responseTimeMs: check.responseTimeMs,
        errorMessage: check.errorMessage
      }))
    }));

    res.json(formattedMonitors);
  } catch (error) {
    console.error("Failed to fetch monitors:", error);
    res.status(500).json({ error: "Failed to fetch monitors" });
  }
});

router.post("/", async (req, res) => {
  const { name, url } = req.body;

  if (!name || !url) {
    return res.status(400).json({ error: "name and url are required" });
  }

  try {
    const newMonitor = await prisma.monitor.create({
      data: {
        name,
        url,
        status: "UNKNOWN"
      }
    });

    await checkMonitor(newMonitor);

    const updatedMonitor = await prisma.monitor.findUnique({
      where: { id: newMonitor.id },
      include: {
        checks: {
          orderBy: {
            checkedAt: "desc"
          },
          take: 10
        }
      }
    });

    res.status(201).json({
      id: updatedMonitor.id,
      name: updatedMonitor.name,
      url: updatedMonitor.url,
      status: updatedMonitor.status,
      history: updatedMonitor.checks.map((check) => ({
        checkedAt: check.checkedAt,
        status: check.status,
        responseTimeMs: check.responseTimeMs,
        errorMessage: check.errorMessage
      }))
    });
  } catch (error) {
    console.error("Failed to create monitor:", error);
    res.status(500).json({ error: "Failed to create monitor" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);

  try {
    const monitor = await prisma.monitor.findUnique({
      where: { id }
    });

    if (!monitor) {
      return res.status(404).json({ error: "Monitor not found" });
    }

    await prisma.monitor.delete({
      where: { id }
    });

    res.json({ message: "Monitor deleted" });
  } catch (error) {
    console.error("Failed to delete monitor:", error);
    res.status(500).json({ error: "Failed to delete monitor" });
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, url } = req.body;

  try {
    const existingMonitor = await prisma.monitor.findUnique({
      where: { id }
    });

    if (!existingMonitor) {
      return res.status(404).json({ error: "Monitor not found" });
    }

    const updatedMonitor = await prisma.monitor.update({
      where: { id },
      data: {
        name: name || existingMonitor.name,
        url: url || existingMonitor.url
      }
    });

    await checkMonitor(updatedMonitor);

    const monitorWithChecks = await prisma.monitor.findUnique({
      where: { id },
      include: {
        checks: {
          orderBy: { checkedAt: "desc" },
          take: 10
        }
      }
    });

    res.json({
      id: monitorWithChecks.id,
      name: monitorWithChecks.name,
      url: monitorWithChecks.url,
      status: monitorWithChecks.status,
      history: monitorWithChecks.checks.map((check) => ({
        checkedAt: check.checkedAt,
        status: check.status,
        responseTimeMs: check.responseTimeMs,
        errorMessage: check.errorMessage
      }))
    });
  } catch (error) {
    console.error("Failed to update monitor:", error);
    res.status(500).json({ error: "Failed to update monitor" });
  }
});

function startMonitorChecks() {
  setInterval(async () => {
    console.log("Re-checking all monitors...");

    try {
      const monitors = await prisma.monitor.findMany();

      for (const monitor of monitors) {
        await checkMonitor(monitor);

        const latestCheck = await prisma.check.findFirst({
          where: { monitorId: monitor.id },
          orderBy: { checkedAt: "desc" }
        });

        if (latestCheck?.errorMessage) {
          console.log(
            `${monitor.name}: ${latestCheck.status} (${latestCheck.responseTimeMs} ms) - ${latestCheck.errorMessage}`
          );
        } else {
          console.log(
            `${monitor.name}: ${latestCheck?.status} (${latestCheck?.responseTimeMs} ms)`
          );
        }
      }
    } catch (error) {
      console.error("Scheduler error:", error);
    }
  }, 30000);
}

module.exports = { router, startMonitorChecks };