ARG pods_csv=/dev/null
ARG grafana_version=latest
ARG grafana_image=grafana-enterprise

FROM grafana/${grafana_image}:${grafana_version}

# Make it as simple as possible to access the grafana instance for development purposes
# Do NOT enable these settings in a public facing / production grafana instance
ENV GF_AUTH_ANONYMOUS_ORG_ROLE "Admin"
ENV GF_AUTH_ANONYMOUS_ENABLED "true"
ENV GF_AUTH_BASIC_ENABLED "false"
# Set development mode so plugins can be loaded without the need to sign
ENV GF_DEFAULT_APP_MODE "development"

# Inject livereload script into grafana index.html
USER root
RUN grafana-cli plugins install marcusolsson-csv-datasource

#  [plugin.marcusolsson-csv-datasource]
#    allow_local_mode = true
RUN echo -ne "[plugin.marcusolsson-csv-datasource]\n  allow_local_mode = true\n" >> /etc/grafana/grafana.ini
COPY ${pods_csv} /tmp/pods.csv
RUN sed -i 's|</body>|<script src="http://localhost:35729/livereload.js"></script></body>|g' /usr/share/grafana/public/views/index.html
