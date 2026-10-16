# Classgrid Code = OpenVSCode Server (pinned exact version) + our changes, running inside the AI sandbox image
# (same tools as the AI: Python, Node, ffmpeg, LibreOffice...). Build with ./build.sh on the sandbox server.
FROM gitpod/openvscode-server@sha256:5e7b8750749f282940a799ed59ccd02fac698ef6744f9113ac01c0ef8e76485e AS ide
USER root
ARG COMMIT
COPY files/default-dark-modern.json files/default-light-modern.json patch-ide.sh /tmp/cg/
COPY assets/ /tmp/cg/assets/
RUN sh /tmp/cg/patch-ide.sh /home/.openvscode-server "$COMMIT"

FROM classgrid-ai-sandbox:latest
USER root
COPY --from=ide --chown=1000:1000 /home/.openvscode-server /opt/ide
USER agent
ENTRYPOINT ["/opt/ide/bin/openvscode-server", "--host", "0.0.0.0", "--port", "3000", "--without-connection-token", "--server-data-dir", "/home/workspace/.openvscode-server"]
