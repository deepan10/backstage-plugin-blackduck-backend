import { Logger } from "winston";
import fetch from "node-fetch";
import {
  BD_REST_API_RESPONSE,
  BD_PROJECT_DETAIL,
  BD_VERISON_DETAIL,
  BD_VERSIONS_API_RESPONSE,
  BD_PROJECTS_API_RESPONSE,
} from "./types";

export class BlackDuckRestApi {
  private _bearer: string;
  private _limit: number;
  public constructor(
    private readonly logger: Logger,
    private readonly host: string,
    private readonly token: string
  ) {
    this._bearer = "";
    this._limit = 1000;
  }

  public async auth() {
    try {
      const auth = await fetch(`${this.host}/tokens/authenticate`, {
        method: "POST",
        headers: {
          Authorization: `token ${this.token}`,
          Accept: "application/vnd.blackducksoftware.user-4+json",
          "Content-Type": "application/json",
        },
      });
      const token = await auth.json();
      this.logger.info("Auth Successfull");
      this._bearer = token.bearerToken;
      return token.bearerToken;
    } catch (error) {
      throw error;
    }
  }
  public async getProjects(name: string): Promise<BD_REST_API_RESPONSE> {
    const projects = await fetch(
      `${this.host}/projects?limit=999&q=name:${name}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this._bearer}`,
          Accept: "application/vnd.blackducksoftware.project-detail-4+json",
          "Content-Type": "application/json",
        },
      }
    );
    this.logger.verbose("Retrived Projects!!");
    return projects.json();
  }

  public async getVersions(
    projectUrl: string,
    versionName: string
  ): Promise<BD_VERSIONS_API_RESPONSE> {
    const versions = await fetch(
      `${projectUrl}/versions?limit=999&q=versionName:${versionName}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this._bearer}`,
          Accept: "application/vnd.blackducksoftware.project-detail-5+json",
          "Content-Type": "application/json",
        },
      }
    );
    this.logger.verbose("Retrived Versions!!");
    return versions.json();
  }

  public async getProjectVersionDetails(
    projectName: string,
    projectVersion: string
  ) {
    let projectDetail: BD_PROJECT_DETAIL | any;
    let versionDetail: BD_VERISON_DETAIL | any;
    const projects: BD_PROJECTS_API_RESPONSE = await this.getProjects(
      projectName
    );
    projects.items.forEach((item: any) => {
      if (item.name === projectName) {
        projectDetail = item;
      }
    });
    if (projectDetail === undefined) {
      this.logger.error("Provide full project name");
    }
    this.logger.verbose(`Fetched Project : ${projectName} details`);
    const versions: BD_VERSIONS_API_RESPONSE = await this.getVersions(
      projectDetail._meta.href,
      projectVersion
    );
    versions.items.forEach((item: any) => {
      if (item.versionName === projectVersion) {
        versionDetail = item;
      }
    });
    if (versionDetail === undefined) {
      this.logger.error("Provide full version name");
    }
    this.logger.verbose(
      `Fetched Project : ${projectName}, Version: ${projectVersion} details`
    );

    return versionDetail;
  }

  public async getVulnerableComponents(
    projectName: string,
    projectVersion: string
  ) {
    const versionDetail = await this.getProjectVersionDetails(
      projectName,
      projectVersion
    );
    const vuln_url = `${versionDetail._meta.href}/vulnerable-bom-components?limit=${this._limit}`;
    const vulns: any = await fetch(vuln_url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this._bearer}`,
        Accept: "application/vnd.blackducksoftware.bill-of-materials-6+json",
        "Content-Type": "application/json",
      },
    });
    this.logger.verbose(
      `Fetched Project : ${projectName}, Version: ${projectVersion} Vulnerable Components`
    );
    return vulns.json();
  }

  public async getRiskProfile(projectName: string, projectVersion: string) {
    const versionDetail = await this.getProjectVersionDetails(
      projectName,
      projectVersion
    );
    const risk_profile_url = `${versionDetail._meta.href}/risk-profile`;
    const risk_profile: any = await fetch(risk_profile_url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this._bearer}`,
        // Accept: 'application/vnd.blackducksoftware.component-detail-5+json',
        "Content-Type": "application/json",
      },
    });
    this.logger.verbose(
      `Fetched Project : ${projectName}, Version: ${projectVersion} risk profile`
    );
    return risk_profile.json();
  }
}
