import {
  Alert,
  CircularProgress,
  Grid,
  Link,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { resolveHistoryEndpoint } from "../common/zap-api";
import ResponsiveAppBar from "../components/ResponsiveAppBar";
import { FixedSizeList } from "react-window";
import { ethers } from "ethers";
import { getENSNames, prettyAddress } from "../common/utils";

type PolygonscanTx = {
  blockHash: string;
  blockNumber: string;
  input: string;
  hash: string;
  from: string;
  to: string;
};

function HistoryPage() {
  const [ensNamesKV, setEnsNamesKV] = useState<null | {
    [key: string]: string;
  }>(null);
  const [historicalTxs, setHistoricalTxs] = useState<null | PolygonscanTx[]>(
    null
  );
  const [historyError, setHistoryError] = useState<string | null>(null);
  const historyEndpoint = resolveHistoryEndpoint(
    process.env.REACT_APP_ZAP_API_ORIGIN,
    process.env.NODE_ENV === "development" && window.location.protocol === "http:"
  );

  const getENS = useCallback(async () => {
    if (historicalTxs === null) return;
    const kv = await getENSNames(historicalTxs.map((x) => x.from));
    setEnsNamesKV(kv);
  }, [historicalTxs]);

  const getHistoricalTx = useCallback(async () => {
    if (historyEndpoint === null) {
      setHistoryError("History is not configured.");
      setHistoricalTxs([]);
      return;
    }
    try {
      const response = await fetch(historyEndpoint);
      if (!response.ok) throw new Error("History provider unavailable");
      const envelope: unknown = await response.json();
      const result = (envelope as { result?: unknown } | null)?.result;
      if (!Array.isArray(result) || result.length > 50) throw new Error("Invalid history list");

      const validated = result.map((item: unknown): PolygonscanTx => {
        if (!item || typeof item !== "object") throw new Error("Invalid history entry");
        const tx = item as Partial<PolygonscanTx>;
        if (typeof tx.from !== "string" || typeof tx.to !== "string" ||
            typeof tx.hash !== "string" || typeof tx.input !== "string" ||
            typeof tx.blockNumber !== "string" ||
            !/^0x[0-9a-fA-F]{64}$/.test(tx.hash) ||
            !/^0x(?:[0-9a-fA-F]{2})*$/.test(tx.input)) {
          throw new Error("Malformed history entry");
        }
        return {
          blockHash: "",
          blockNumber: tx.blockNumber,
          input: tx.input,
          hash: tx.hash,
          from: ethers.utils.getAddress(tx.from),
          to: ethers.utils.getAddress(tx.to),
        };
      });
      setHistoricalTxs(validated);
    } catch (_) {
      setHistoryError("History is unavailable right now.");
      setHistoricalTxs([]);
    }
  }, [historyEndpoint]);

  useEffect(() => {
    if (historicalTxs === null) void getHistoricalTx();
  }, [historicalTxs, getHistoricalTx]);

  useEffect(() => {
    if (historicalTxs !== null && historicalTxs.length > 0 &&
        ensNamesKV === null) void getENS();
  }, [historicalTxs, ensNamesKV, getENS]);

  return (
    <>
      <ResponsiveAppBar />

      <Grid container marginTop={2}>
        <Grid item xs={1} md={3} />
        <Grid item md={6} xs={10}>
          <Typography variant="h3">History</Typography>
          <Typography variant="subtitle1">Last 50 messages</Typography>
          {historyError && <Alert severity="warning">{historyError}</Alert>}
          <div style={{ marginTop: "25px" }}></div>

          {historicalTxs !== null ? (
            <FixedSizeList
              height={500}
              width={"100%"}
              itemSize={50}
              itemCount={historicalTxs.length}
              overscanCount={5}
            >
              {({ index, style }) => {
                const curTx = historicalTxs[index];
                let maybeStr = "[ERROR DECODING]";
                try {
                  maybeStr = ethers.utils
                    .toUtf8String(historicalTxs[index].input)
                    .slice(0, 64);
                } catch (e) {}
                let displayName = curTx.from;
                if (ensNamesKV) {
                  const curEnsName =
                    ensNamesKV[ethers.utils.getAddress(displayName)];
                  if (curEnsName !== undefined && curEnsName !== "") {
                    displayName = curEnsName;
                  }
                }

                return (
                  <ListItem
                    style={style}
                    key={index}
                    component="div"
                    disablePadding
                  >
                    <ListItemButton>
                      <Link
                        href={`https://polygonscan.com/tx/${curTx.hash}`}
                        color="inherit"
                        style={{ textDecoration: "none" }}
                      >
                        <ListItemText
                          primary={`${index + 1}. [${prettyAddress(
                            displayName
                          )}]: ${maybeStr}`}
                        />
                      </Link>
                    </ListItemButton>
                  </ListItem>
                );
              }}
            </FixedSizeList>
          ) : (
            <CircularProgress />
          )}
        </Grid>
        <Grid item xs={1} md={3} />
      </Grid>
    </>
  );
}

export default HistoryPage;
