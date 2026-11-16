// Live doc page (chat.classgrid.in/docs/<id>): the doc on its own. The doc itself is LiveDocView.tsx, which Studio's
// right pane shows too.
import { useParams } from "react-router-dom";
import { LiveDocView } from "./LiveDocView";

export function LiveDocPage() {
  const { id = "" } = useParams();
  return <LiveDocView key={id} id={id} />;
}

export default LiveDocPage;
