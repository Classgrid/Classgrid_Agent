/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

// 1. Fix TransactionComponents.tsx Table
const transCompPath = 'client/src/features/superadmin/billing/components/finance/TransactionComponents.tsx';
let transComp = fs.readFileSync(transCompPath, 'utf8');

const oldTransCols = `  const columns = [
    {
      key: "paymentId",
      header: "Payment ID",
      render: (_: any, tx: any) => (
        <div>
          <div className="font-mono text-sm">{tx.razorpayPaymentId || tx.id || "N/A"}</div>
          <div className="text-xs text-muted-foreground mt-1 uppercase">{tx.paymentMethod || "UNKNOWN"}</div>
        </div>
      ),
    },
    {
      key: "organization",
      header: "Organization",
      render: (_: any, tx: any) => (
        <div>
          <div className="flex items-center gap-1.5 font-medium">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            {tx.organization?.name || tx.orgId || tx.organizationName || "Unknown"}
          </div>
          <div className="font-mono text-xs text-muted-foreground mt-1">Org ID: {tx.orgId || tx.organizationId || "N/A"}</div>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer Detail",
      render: (_: any, tx: any) => (
        <div>
          <div className="font-medium text-sm">{tx.userMobile || "No Mobile"}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{tx.userEmail || "No Email"}</div>
          <div className="font-mono text-[10px] text-muted-foreground mt-0.5">UID: {tx.userId || tx.payer?.id || "N/A"}</div>
        </div>
      ),
    },
    {
      key: "date",
      header: "Created on",
      render: (_: any, tx: any) => <span className="whitespace-nowrap text-sm text-muted-foreground">{format(new Date(tx.createdAt), 'EEE MMM dd, h:mma')}</span>,
    },
    {
      key: "type",
      header: "Type",
      render: (_: any, tx: any) => <Badge variant="outline" className="font-mono text-xs uppercase bg-muted/50">{tx.type}</Badge>,
    },
    {
      key: "amount",
      header: "Amount",
      render: (_: any, tx: any) => <span className="font-medium"><MoneyDisplay amountPaise={tx.amountPaise} /></span>,
    },
    {
      key: "status",
      header: "Status",
      render: (_: any, tx: any) => <TransactionStatusBadge status={tx.status} />,
    },
    {
      key: "actions",
      header: "Reference",
      render: (_: any, tx: any) => (
        <div className="text-right">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onViewDetail(tx.id); }} className="h-8 gap-1">
            Details <ArrowRightCircle className="w-3 h-3" />
          </Button>
        </div>
      ),
    },
  ];`;

const newTransCols = `  const columns = [
    {
      key: "organization",
      header: "Organization",
      render: (_: any, tx: any) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="font-medium text-foreground">{tx.organization?.name || tx.orgId || tx.organizationName || "Classgrid"}</div>
            <div className="text-xs text-muted-foreground">Org ID: {tx.orgId || tx.organizationId || "N/A"}</div>
          </div>
        </div>
      ),
    },
    {
      key: "paymentDetail",
      header: "Payment Detail",
      render: (_: any, tx: any) => (
        <div>
          <div className="font-medium text-foreground">{tx.razorpayPaymentId || tx.id || "N/A"}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(tx.createdAt), 'MMM dd, yyyy')} • {tx.type?.toUpperCase() || 'UNKNOWN'}
          </div>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (_: any, tx: any) => (
        <div className="font-medium text-foreground">
          <MoneyDisplay amountPaise={tx.amountPaise} />
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (_: any, tx: any) => (
        <div className="flex items-center gap-2">
          <div className={\`h-2 w-2 rounded-full \${tx.status === 'success' || tx.status === 'COMPLETED' || tx.status === 'CAPTURED' ? 'bg-emerald-500' : tx.status === 'failed' || tx.status === 'DECLINED' ? 'bg-red-500' : 'bg-yellow-500'}\`} />
          <span className="text-sm text-foreground capitalize">{tx.status || 'Unknown'}</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Action",
      render: (_: any, tx: any) => (
        <div className="text-right">
          <Button 
            onClick={(e) => { e.stopPropagation(); onViewDetail(tx.id); }} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6"
          >
            View
          </Button>
        </div>
      ),
    },
  ];`;

transComp = transComp.replace(oldTransCols, newTransCols);
fs.writeFileSync(transCompPath, transComp);
console.log("Updated TransactionTable");

// 2. Fix FailureComponents.tsx Table
const failCompPath = 'client/src/features/superadmin/billing/components/finance/FailureComponents.tsx';
let failComp = fs.readFileSync(failCompPath, 'utf8');

const oldFailCols = `  const columns = [
    {
      key: "paymentId",
      header: "Payment ID",
      render: (_: any, tx: any) => (
        <div className="font-mono text-sm">{tx.providerPaymentId || tx.paymentId || "N/A"}</div>
      ),
    },
    {
      key: "organization",
      header: "Organization",
      render: (_: any, tx: any) => (
        <div>
          <div className="flex items-center gap-1.5 font-medium">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            {tx.organization?.name || tx.organizationName || tx.orgId || "Unknown"}
          </div>
          <div className="font-mono text-xs text-muted-foreground mt-1">Org ID: {tx.orgId || tx.organizationId || "N/A"}</div>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer Detail",
      render: (_: any, tx: any) => (
        <div>
          <div className="font-medium text-sm">{tx.userMobile || "No Mobile"}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{tx.userEmail || "No Email"}</div>
          <div className="font-mono text-[10px] text-muted-foreground mt-0.5">UID: {tx.userId || tx.payer?.id || "N/A"}</div>
        </div>
      ),
    },
    {
      key: "date",
      header: "Created on",
      render: (_: any, tx: any) => <span className="whitespace-nowrap text-sm text-muted-foreground">{format(new Date(tx.createdAt), 'MMM dd, h:mma')}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      render: (_: any, tx: any) => <span className="font-medium"><MoneyDisplay amountPaise={tx.amountPaise || tx.amount * 100} /></span>,
    },
    {
      key: "status",
      header: "Status",
      render: (_: any, tx: any) => <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">FAILED</Badge>,
    },
    {
      key: "actions",
      header: "Action",
      render: (_: any, tx: any) => (
        <div className="text-right">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onViewDetail(tx.id); }} className="h-8 gap-1">
            Details <ArrowRightCircle className="w-3 h-3" />
          </Button>
        </div>
      ),
    },
  ];`;

const newFailCols = `  const columns = [
    {
      key: "organization",
      header: "Organization",
      render: (_: any, tx: any) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="font-medium text-foreground">{tx.organization?.name || tx.organizationName || tx.orgId || "Unknown"}</div>
            <div className="text-xs text-muted-foreground">Org ID: {tx.orgId || tx.organizationId || "N/A"}</div>
          </div>
        </div>
      ),
    },
    {
      key: "paymentDetail",
      header: "Payment Detail",
      render: (_: any, tx: any) => (
        <div>
          <div className="font-medium text-foreground">{tx.providerPaymentId || tx.paymentId || "N/A"}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(tx.createdAt), 'MMM dd, yyyy')}
          </div>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (_: any, tx: any) => (
        <div className="font-medium text-foreground">
          <MoneyDisplay amountPaise={tx.amountPaise || tx.amount * 100} />
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (_: any, tx: any) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-sm text-foreground">Failed</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Action",
      render: (_: any, tx: any) => (
        <div className="text-right">
          <Button 
            onClick={(e) => { e.stopPropagation(); onViewDetail(tx.id); }} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6"
          >
            View
          </Button>
        </div>
      ),
    },
  ];`;

failComp = failComp.replace(oldFailCols, newFailCols);
fs.writeFileSync(failCompPath, failComp);
console.log("Updated FailureTable");

// 3. Fix TransactionDetailsPage.tsx
const transDetailsPath = 'client/src/features/superadmin/billing/pages/TransactionDetailsPage.tsx';
let transDetails = fs.readFileSync(transDetailsPath, 'utf8');

// Replace header
const oldTransHeader = `<div className="border-b border-border bg-card p-6 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Transaction Details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Transaction ID: {transaction?.id || id}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={() => navigate(-1)} variant="outline">Go Back</Button>
      </div>
    </div>`;

const newTransHeader = `<div className="border-b border-border bg-card p-4 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="cursor-pointer hover:text-foreground transition-colors" onClick={() => navigate('/super-admin/billing/transactions')}>Transactions</span>
        <span>/</span>
        <span className="text-foreground font-medium">{transaction?.razorpayPaymentId || id}</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8 rounded-full bg-muted/50 hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold tracking-tight">Transaction Details</h2>
        </div>
      </div>
    </div>`;

if(transDetails.includes(oldTransHeader)) {
    transDetails = transDetails.replace(oldTransHeader, newTransHeader);
} else {
    // try finding just the inner HTML
    transDetails = transDetails.replace(/<div className="border-b border-border bg-card p-6[\s\S]*?<\/div>\s*<\/div>/, newTransHeader);
}

// Add ArrowLeft to lucide-react imports if not there
if (!transDetails.includes('ArrowLeft')) {
    transDetails = transDetails.replace('import { CheckCircle2', 'import { ArrowLeft, CheckCircle2');
}

fs.writeFileSync(transDetailsPath, transDetails);
console.log("Updated TransactionDetailsPage");

// 4. Fix FailedPaymentDetailsPage.tsx
const failDetailsPath = 'client/src/features/superadmin/billing/pages/FailedPaymentDetailsPage.tsx';
let failDetails = fs.readFileSync(failDetailsPath, 'utf8');

const oldFailHeader = `<div className="border-b border-border bg-card p-6 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Failed Payment Details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Failure ID: {failure?.id || id}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={() => navigate(-1)} variant="outline">Go Back</Button>
      </div>
    </div>`;

const newFailHeader = `<div className="border-b border-border bg-card p-4 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="cursor-pointer hover:text-foreground transition-colors" onClick={() => navigate('/super-admin/billing/failed-payments')}>Failed Payments</span>
        <span>/</span>
        <span className="text-foreground font-medium">{failure?.providerPaymentId || id}</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8 rounded-full bg-muted/50 hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold tracking-tight">Failed Payment Details</h2>
        </div>
      </div>
    </div>`;

if(failDetails.includes(oldFailHeader)) {
    failDetails = failDetails.replace(oldFailHeader, newFailHeader);
} else {
    failDetails = failDetails.replace(/<div className="border-b border-border bg-card p-6[\s\S]*?<\/div>\s*<\/div>/, newFailHeader);
}

if (!failDetails.includes('ArrowLeft')) {
    failDetails = failDetails.replace('import { AlertCircle', 'import { ArrowLeft, AlertCircle');
}

fs.writeFileSync(failDetailsPath, failDetails);
console.log("Updated FailedPaymentDetailsPage");

