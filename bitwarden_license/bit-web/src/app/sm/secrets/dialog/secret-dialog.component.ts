import { DialogRef, DIALOG_DATA } from "@angular/cdk/dialog";
import { Component, Inject, OnInit } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";

import { I18nService } from "@bitwarden/common/abstractions/i18n.service";
import { PlatformUtilsService } from "@bitwarden/common/abstractions/platformUtils.service";
import { SecretView } from "@bitwarden/common/models/view/secretView";

import { SecretService } from "../secret.service";

export enum OperationType {
  Add,
  Edit,
}

export interface SecretOperation {
  organizationId: string;
  operation: OperationType;
  secretId?: string;
}

@Component({
  selector: "sm-secret-dialog",
  templateUrl: "./secret-dialog.component.html",
})
export class SecretDialogComponent implements OnInit {
  formPromise: Promise<any>;

  formGroup = new FormGroup({
    name: new FormControl("", [Validators.required]),
    value: new FormControl("", [Validators.required]),
    notes: new FormControl(""),
  });

  constructor(
    public dialogRef: DialogRef,
    @Inject(DIALOG_DATA) private data: SecretOperation,
    private secretService: SecretService,
    private i18nService: I18nService,
    private platformUtilsService: PlatformUtilsService
  ) {}

  async ngOnInit() {
    if (this.data.operation === OperationType.Edit && this.data.secretId) {
      await this.loadData();
    } else if (this.data.operation !== OperationType.Add) {
      this.dialogRef.close();
      throw new Error(`The secret dialog was not called with the appropriate operation values.`);
    }
  }

  async loadData() {
    const secret: SecretView = await this.secretService.getBySecretId(this.data.secretId);
    this.formGroup.setValue({ name: secret.name, value: secret.value, notes: secret.note });
  }

  get title() {
    return this.data.operation === OperationType.Add ? "addSecret" : "editSecret";
  }

  async submit() {
    if (this.formGroup.invalid) {
      return;
    }

    const secretView = this.getSecretView();
    if (this.data.operation === OperationType.Add) {
      await this.createSecret(secretView);
    } else {
      secretView.id = this.data.secretId;
      await this.updateSecret(secretView);
    }
    this.dialogRef.close();
  }

  private async createSecret(secretView: SecretView) {
    this.formPromise = this.secretService.create(this.data.organizationId, secretView);
    await this.formPromise;
    this.platformUtilsService.showToast("success", null, this.i18nService.t("secretCreated"));
  }

  private async updateSecret(secretView: SecretView) {
    this.formPromise = this.secretService.update(this.data.organizationId, secretView);
    await this.formPromise;
    this.platformUtilsService.showToast("success", null, this.i18nService.t("secretEdited"));
  }

  private getSecretView() {
    const secretView = new SecretView();
    secretView.organizationId = this.data.organizationId;
    secretView.name = this.formGroup.value.name;
    secretView.value = this.formGroup.value.value;
    secretView.note = this.formGroup.value.notes;
    return secretView;
  }
}