
const cron = require("node-cron");

const db = require("../config/db");
const recurringTransactionService = require("./recurring-transaction.service");
const notificationService = require("./notification.service");

const TIME_ZONE = "Asia/Jakarta";
const SCHEDULE = "*/5 * * * *";

let scheduledTask = null;
let isRunning = false;

async function processUserRecurringTransactions(userId) {
    try {
        const data =
            await recurringTransactionService.processRecurringTransactions(
                userId
            );

        for (const transaction of data.transactions || []) {
            try {
                await notificationService.createNotification({
                    userId,
                    type: "recurring_success",
                    title: "Transaksi berulang berhasil diproses",
                    message:
                        `Transaksi untuk jadwal #${transaction.recurring_transaction_id} ` +
                        `berhasil dibuat pada ${transaction.transaction_date}.`,
                    link: "/transactions",
                    dedupeKey:
                        `recurring-success:${transaction.recurring_transaction_id}:` +
                        `${transaction.transaction_date}`,
                });
            } catch (notificationError) {
                console.error(
                    `[Recurring Scheduler] Gagal membuat notifikasi sukses ` +
                    `untuk user ${userId}:`,
                    notificationError
                );
            }
        }

        console.log(
            `[Recurring Scheduler] User ${userId}: ` +
            `processed=${data.processed}, ` +
            `created=${data.transactions_created}`
        );

        return data;
    } catch (error) {
        console.error(
            `[Recurring Scheduler] Gagal memproses recurring user ${userId}:`,
            error
        );

        const jakartaDate =
            recurringTransactionService.getTodayDate();

        try {
            await notificationService.createNotification({
                userId,
                type: "recurring_failure",
                title: "Pemrosesan transaksi berulang gagal",
                message:
                    "Pocketa gagal memproses transaksi berulang. " +
                    "Periksa akun dan jadwal recurring, lalu coba kembali.",
                link: "/recurring",
                dedupeKey: `recurring-failure:${jakartaDate}`,
            });
        } catch (notificationError) {
            console.error(
                `[Recurring Scheduler] Gagal membuat notifikasi error ` +
                `untuk user ${userId}:`,
                notificationError
            );
        }

        return null;
    }
}

async function runRecurringTransactionScheduler() {
    if (isRunning) {
        console.log(
            "[Recurring Scheduler] Siklus sebelumnya masih berjalan; " +
            "siklus ini dilewati."
        );
        return;
    }

    isRunning = true;

    try {
        const today = recurringTransactionService.getTodayDate();

        const [users] = await db.query(
            `
            SELECT DISTINCT rt.user_id
            FROM recurring_transactions AS rt
            INNER JOIN accounts AS a
                ON a.id = rt.account_id
                AND a.user_id = rt.user_id
            WHERE rt.is_active = 1
              AND rt.next_occurrence <= ?
              AND a.is_active = 1
            ORDER BY rt.user_id ASC
            `,
            [today]
        );

        if (users.length === 0) {
            console.log(
                `[Recurring Scheduler] Tidak ada jadwal jatuh tempo (${today}).`
            );
            return;
        }

        console.log(
            `[Recurring Scheduler] Memproses ${users.length} user; tanggal ${today}.`
        );

        for (const user of users) {
            await processUserRecurringTransactions(user.user_id);
        }
    } catch (error) {
        console.error(
            "[Recurring Scheduler] Gagal menjalankan siklus scheduler:",
            error
        );
    } finally {
        isRunning = false;
    }
}

function startRecurringTransactionScheduler() {
    if (scheduledTask) {
        console.log("[Recurring Scheduler] Scheduler sudah aktif.");
        return scheduledTask;
    }

    scheduledTask = cron.schedule(
        SCHEDULE,
        () => {
            void runRecurringTransactionScheduler();
        },
        {
            timezone: TIME_ZONE,
        }
    );

    console.log(
        `[Recurring Scheduler] Aktif setiap 5 menit; timezone=${TIME_ZONE}.`
    );

    return scheduledTask;
}

function stopRecurringTransactionScheduler() {
    if (!scheduledTask) {
        return;
    }

    scheduledTask.stop();
    scheduledTask = null;

    console.log("[Recurring Scheduler] Scheduler dihentikan.");
}

module.exports = {
    startRecurringTransactionScheduler,
    stopRecurringTransactionScheduler,
    runRecurringTransactionScheduler,
};
