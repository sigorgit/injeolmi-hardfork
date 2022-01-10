import { InjeolmiV2SMnoGen } from "../typechain";

import { ethers, network } from "hardhat";
import { expect } from "chai";
import { BigNumberish, constants } from "ethers";

import { autoMining, mine } from "./utils/blocks";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const { BigNumber, utils, Wallet } = ethers;

const setupTest = async () => {
    const signers = await ethers.getSigners();
    const [owner, A, B, C, D, E, F] = signers;

    const Injeolmi = await ethers.getContractFactory("InjeolmiV2SMnoGen");
    const ij = (await Injeolmi.deploy()) as InjeolmiV2SMnoGen;

    expect(await ij.balanceOf(owner.address)).to.be.equal(utils.parseEther("100000000"));

    return {
        owner,
        A,
        B,
        C,
        D,
        E,
        F,
        ij,
    };
};

describe("InjeolmiV2_SMnoGen", () => {
    beforeEach(async () => {
        await ethers.provider.send("hardhat_reset", []);
    });

    it("-", async () => {
        const { owner, A, B, C, D, E, F, ij } = await setupTest();

        const userNumber = 10;
        const users = [] as any;
        for (let i = 0; i < userNumber; i++) {
            const user = ethers.Wallet.createRandom().connect(ethers.provider);
            users.push(user);
            await ij.transfer(user.address, utils.parseEther("1"));
            await owner.sendTransaction({ to: user.address, value: utils.parseEther("10") });
        }

        async function show(specific?: boolean) {
            const balA = await ij.balanceOf(A.address);
            const balB = await ij.balanceOf(B.address);
            const balC = await ij.balanceOf(C.address);
            const balD = await ij.balanceOf(D.address);
            const balE = await ij.balanceOf(E.address);
            const balF = await ij.balanceOf(F.address);
            const balO = await ij.balanceOf(owner.address);

            let balUsers = Array.from({ length: userNumber }, () => constants.Zero);
            let rbalUsers = Array.from({ length: userNumber }, () => constants.Zero);
            for (let i = 0; i < userNumber; i++) {
                balUsers[i] = await ij.balanceOf(users[i].address);
                rbalUsers[i] = (await ij._userInfo(users[i].address))._rOwned;
            }

            const rbalA = (await ij._userInfo(A.address))._rOwned;
            const rbalB = (await ij._userInfo(B.address))._rOwned;
            const rbalC = (await ij._userInfo(C.address))._rOwned;
            const rbalD = (await ij._userInfo(D.address))._rOwned;
            const rbalE = (await ij._userInfo(E.address))._rOwned;
            const rbalF = (await ij._userInfo(F.address))._rOwned;
            const rbalO = (await ij._userInfo(owner.address))._rOwned;

            let total = balA.add(balB).add(balC).add(balD).add(balE).add(balF).add(balO);
            let rtotal = rbalA.add(rbalB).add(rbalC).add(rbalD).add(rbalE).add(rbalF).add(rbalO);

            for (let i = 0; i < userNumber; i++) {
                total = total.add(balUsers[i]);
                rtotal = rtotal.add(rbalUsers[i]);
            }

            console.log("real total", utils.formatEther(total));
            console.log(
                "rtotal and diff",
                (await ij._rTotal()).toString(),
                (await ij._rTotal()).sub(rtotal).toString()
            );
            const rate = await ij._getRate();
            console.log("r/t rate", rate.toString());

            if (specific) {
                console.log("A : ", utils.formatEther(balA), rbalA.toString());
                console.log("B : ", utils.formatEther(balB), rbalB.toString());
                console.log("C : ", utils.formatEther(balC), rbalC.toString());
                console.log("D : ", utils.formatEther(balD), rbalD.toString());
                console.log("E : ", utils.formatEther(balE), rbalE.toString());
                console.log("F : ", utils.formatEther(balF), rbalF.toString());
                console.log("O : ", utils.formatEther(balO), rbalO.toString());
                for (let i = 0; i < userNumber; i++) {
                    console.log(`user${i} : `, utils.formatEther(balUsers[i]), rbalUsers[i].toString());
                }
            }

            console.log();
            // const gen = await ij.generation();
            // console.log("Gen ", gen);
            // console.log("accMul ", (await ij.accMultiplier(0)));
            // if(gen.gt(constants.Zero)) console.log("accMul[-1] ", (await ij.accMultiplier(gen.sub(1))));
            console.log();
        }

        async function getBalances_(user0: SignerWithAddress, user1: SignerWithAddress, transferAmount: BigNumberish) {
            let _users = [A.address, B.address, C.address, D.address, E.address, F.address, owner.address];
            for (let i = 0; i < userNumber; i++) {
                _users.push(users[i].address);
            }

            let balUsers = Array.from({ length: userNumber + 7 }, () => constants.Zero);
            for (let i = 0; i < userNumber + 7; i++) {
                balUsers[i] = await ij.balanceOf(_users[i]);
            }

            let total = constants.Zero;
            for (let i = 0; i < balUsers.length; i++) {
                total = total.add(balUsers[i]);
            }

            if ((await ij.isExcludedFrom(user0.address)) || (await ij.isExcludedTo(user1.address))) {
                balUsers[_users.indexOf(user0.address)] = balUsers[_users.indexOf(user0.address)].sub(transferAmount);
                balUsers[_users.indexOf(user1.address)] = balUsers[_users.indexOf(user1.address)].add(transferAmount);

                balUsers.push(total);
                return balUsers;
            }

            balUsers[_users.indexOf(user0.address)] = balUsers[_users.indexOf(user0.address)].sub(transferAmount);
            balUsers[_users.indexOf(user1.address)] = balUsers[_users.indexOf(user1.address)].add(
                BigNumber.from(transferAmount).mul(9).div(10)
            ); // 90%
            balUsers[6] = balUsers[6].add(BigNumber.from(transferAmount).div(100)); //owner 1%

            let noDistTotal = constants.Zero;
            const noDistLength = (await ij.noDistributionLength()).toNumber();
            for (let i = 0; i < noDistLength; i++) {
                noDistTotal = noDistTotal.add(balUsers[_users.indexOf(await ij.noDistribution(i))]);
            }

            const totalExceptNoDistribution = total.sub(noDistTotal);
            const tEND_fee = totalExceptNoDistribution.sub(BigNumber.from(transferAmount).mul(9).div(100)); //9%

            let balAfters = Array.from({ length: userNumber + 7 }, () => constants.Zero);
            for (let i = 0; i < balAfters.length; i++) {
                if (await ij.isNoDistribution(_users[i])) balAfters[i] = balUsers[i];
                else balAfters[i] = balUsers[i].mul(totalExceptNoDistribution).div(tEND_fee);
            }
            balAfters.push(total); //last is total!
            return balAfters;
        }

        async function checking(balAfters: BigNumberish[], extra?: any) {
            let _users = [A.address, B.address, C.address, D.address, E.address, F.address, owner.address];
            for (let i = 0; i < userNumber; i++) {
                _users.push(users[i].address);
            }

            let balUsers = Array.from({ length: userNumber + 7 }, () => constants.Zero);
            for (let i = 0; i < userNumber + 7; i++) {
                balUsers[i] = await ij.balanceOf(_users[i]);
            }

            let total = constants.Zero;
            for (let i = 0; i < balUsers.length; i++) {
                total = total.add(balUsers[i]);
            }

            for (let i = 0; i < userNumber + 7; i++) {
                if (balUsers[i].sub(balAfters[i]).abs().gte(utils.parseEther("1"))) {
                    console.log(`${i}th user problem! contract / calculated`);
                    console.log(utils.formatEther(balUsers[i]));
                    console.log(utils.formatEther(balAfters[i]));
                    console.log(balAfters);
                    console.log(extra);
                    await show(true);
                }
            }
            if (
                total
                    .sub(balAfters[balAfters.length - 1])
                    .abs()
                    .gte(utils.parseEther("5"))
            ) {
                console.log(`total number problem! contract / calculated`);
                console.log(utils.formatEther(total));
                console.log(utils.formatEther(balAfters[balAfters.length - 1]));
                console.log(balAfters);
                console.log(extra);
                await show(true);
            }
        }

        function getUsersIndex(user: SignerWithAddress) {
            let _users = [A.address, B.address, C.address, D.address, E.address, F.address, owner.address];
            for (let i = 0; i < userNumber; i++) {
                _users.push(users[i].address);
            }
            return _users.indexOf(user.address);
        }

        await ij.transfer(A.address, utils.parseEther("85000000"));
        await ij.transfer(B.address, utils.parseEther("5000000"));
        await ij.transfer(C.address, utils.parseEther("1"));
        await ij.transfer(D.address, utils.parseEther("1"));
        await ij.transfer(E.address, utils.parseEther("1"));
        await ij.transfer(F.address, utils.parseEther("1"));
        await show();

        async function randomAmount(user: SignerWithAddress) {
            const bal = await ij.balanceOf(user.address);
            const randPercent = Math.floor(Math.random() * 60) + 41;
            const ra = bal.mul(randPercent).div(100);
            return ra.gt(constants.Zero) ? ra : constants.One;
        }

        function randomUser() {
            const rand = Math.floor(Math.random() * (7 + userNumber));
            if (rand == 0) return A;
            else if (rand == 1) return B;
            else if (rand == 2) return C;
            else if (rand == 3) return D;
            else if (rand == 4) return E;
            else if (rand == 5) return F;
            else if (rand == 6) return owner;
            else {
                return users[rand - 7];
            }
        }

        function getUsers() {
            let user0 = randomUser() as SignerWithAddress;
            let user1 = randomUser() as SignerWithAddress;
            while (user0.address == user1.address) {
                user1 = randomUser() as SignerWithAddress;
            }
            return { user0, user1 };
        }

        await ij.addToNoDistribution(A.address);

        let isShow = false;

        for (let i = 0; i < 30000; i++) {
            let users = getUsers();
            while ((await ij.balanceOf(users.user0.address)).isZero()) {
                users = getUsers();
            }

            let amount = await randomAmount(users.user0);

            // await show(true);
            // console.log(`${i}th transfer. from: ${getUsersIndex(users.user0)}, to: ${getUsersIndex(users.user1)} ${utils.formatEther(amount)}`);

            let doCheck = false;
            if (i > 16000) doCheck = true;

            if (i % 1000 == 0) {
                console.log(i, "th");
                console.log((await ij._getRate()).toString());
                if (i >= 9000) await show(true);
            }
            let balAfters;
            if (doCheck) balAfters = await getBalances_(users.user0, users.user1, amount);

            await ij.connect(users.user0).transfer(users.user1.address, amount);

            if (doCheck)
                await checking(
                    balAfters as any,
                    `${i}th transfer. from: ${getUsersIndex(users.user0)}, to: ${getUsersIndex(
                        users.user1
                    )} ${utils.formatEther(amount)}`
                );

            // await show(true);
            // if (isShow) {
            //     console.log(`transfer ${amount.toString()}`);
            //     await show(true);
            // }
        }
    });

    it.only("-2", async () => {
        const { owner, A, B, C, D, E, F, ij } = await setupTest();

        const userNumber = 100;
        // const userNumber = 10;
        const users = [] as any;
        for (let i = 0; i < userNumber; i++) {
            const user = ethers.Wallet.createRandom().connect(ethers.provider);
            users.push(user);
            await ij.transfer(user.address, utils.parseEther("1"));
            await owner.sendTransaction({ to: user.address, value: utils.parseEther("10") });
        }

        const _users = [A.address, B.address, C.address, D.address, E.address, F.address, owner.address];
        for (let i = 0; i < userNumber; i++) {
            _users.push(users[i].address);
        }

        async function show(specific?: boolean) {
            const bals = await ij.tmultiBalanceOf(_users);
            const rbals = await ij.tmultiROwned(_users);

            const balA = bals[0];
            const balB = bals[1];
            const balC = bals[2];
            const balD = bals[3];
            const balE = bals[4];
            const balF = bals[5];
            const balO = bals[6];

            let balUsers = Array.from({ length: userNumber }, () => constants.Zero);
            let rbalUsers = Array.from({ length: userNumber }, () => constants.Zero);
            for (let i = 0; i < userNumber; i++) {
                balUsers[i] = bals[7 + i];
                rbalUsers[i] = rbals[7 + i];
            }

            const rbalA = rbals[0];
            const rbalB = rbals[1];
            const rbalC = rbals[2];
            const rbalD = rbals[3];
            const rbalE = rbals[4];
            const rbalF = rbals[5];
            const rbalO = rbals[6];

            let total = balA.add(balB).add(balC).add(balD).add(balE).add(balF).add(balO);
            let rtotal = rbalA.add(rbalB).add(rbalC).add(rbalD).add(rbalE).add(rbalF).add(rbalO);

            for (let i = 0; i < userNumber; i++) {
                total = total.add(balUsers[i]);
                rtotal = rtotal.add(rbalUsers[i]);
            }

            console.log("real total", utils.formatEther(total));
            const rTotalFromContract = await ij._rTotal();
            console.log("rtotal and diff", rTotalFromContract.toString(), rTotalFromContract.sub(rtotal).toString());
            const rate = await ij._getRate();
            console.log("r/t rate", rate.toString());
            const rSupply = rtotal.sub(rbalA);
            //CHECK... 편의를 위해 A만 예외라고 가정!
            console.log(
                "if(rS < rT/tT), rSupply, rTotal/tTotal",
                rSupply.lt(rtotal.div(utils.parseEther("100000000"))),
                // rSupply.toString(),
                // rtotal.div(utils.parseEther("100000000")).toString()
            );

            if (specific) {
                console.log("A : ", utils.formatEther(balA), rbalA.toString());
                console.log("B : ", utils.formatEther(balB), rbalB.toString());
                console.log("C : ", utils.formatEther(balC), rbalC.toString());
                console.log("D : ", utils.formatEther(balD), rbalD.toString());
                console.log("E : ", utils.formatEther(balE), rbalE.toString());
                console.log("F : ", utils.formatEther(balF), rbalF.toString());
                console.log("O : ", utils.formatEther(balO), rbalO.toString());
                for (let i = 0; i < userNumber; i++) {
                    console.log(`user${i} : `, utils.formatEther(balUsers[i]), rbalUsers[i].toString());
                }
            }

            console.log();
            // const gen = await ij.generation();
            // console.log("Gen ", gen);
            // console.log("accMul ", (await ij.accMultiplier(0)));
            // if(gen.gt(constants.Zero)) console.log("accMul[-1] ", (await ij.accMultiplier(gen.sub(1))));
            console.log();
        }

        async function getBalances_(user0: SignerWithAddress, user1: SignerWithAddress, transferAmount: BigNumberish) {
            let balUsers = Array.from({ length: userNumber + 7 }, () => constants.Zero);
            const bals = await ij.tmultiBalanceOf(_users);
            let total = constants.Zero;

            for (let i = 0; i < userNumber + 7; i++) {
                balUsers[i] = bals[i];
                total = total.add(bals[i]);
            }

            const user0Id = _users.indexOf(user0.address);
            const user1Id = _users.indexOf(user1.address);

            if ((await ij.isExcludedFrom(user0.address)) || (await ij.isExcludedTo(user1.address))) {
                balUsers[user0Id] = balUsers[user0Id].sub(transferAmount);
                balUsers[user1Id] = balUsers[user1Id].add(transferAmount);

                balUsers.push(total);
                return balUsers;
            }

            balUsers[user0Id] = balUsers[user0Id].sub(transferAmount);
            balUsers[user1Id] = balUsers[user1Id].add(BigNumber.from(transferAmount).mul(9).div(10)); // 90%
            balUsers[6] = balUsers[6].add(BigNumber.from(transferAmount).div(100)); //owner 1%

            let noDistTotal = constants.Zero;
            const noDistLength = (await ij.noDistributionLength()).toNumber();
            const noDistList = Array.from({ length: noDistLength }, () => constants.AddressZero);
            for (let i = 0; i < noDistLength; i++) {
                const noD = await ij.noDistribution(i);
                noDistTotal = noDistTotal.add(balUsers[_users.indexOf(noD)]);
                noDistList[i] = noD;
            }

            const totalExceptNoDistribution = total.sub(noDistTotal);
            const tEND_fee = totalExceptNoDistribution.sub(BigNumber.from(transferAmount).mul(9).div(100)); //9%

            let balAfters = Array.from({ length: userNumber + 7 }, () => constants.Zero);
            for (let i = 0; i < balAfters.length; i++) {
                if (noDistList.includes(_users[i])) balAfters[i] = balUsers[i];
                else balAfters[i] = balUsers[i].mul(totalExceptNoDistribution).div(tEND_fee);
            }
            balAfters.push(total); //last is total!
            return balAfters;
        }

        async function checking(balAfters: BigNumberish[], extra?: string, accountNumber?: number) {
            let balUsers = Array.from({ length: userNumber + 7 }, () => constants.Zero);
            const bals = await ij.tmultiBalanceOf(_users);
            let total = constants.Zero;

            for (let i = 0; i < userNumber + 7; i++) {
                balUsers[i] = bals[i];
                total = total.add(bals[i]);
            }
            let fin = false;
            if(accountNumber === undefined || accountNumber > userNumber + 7) {
                for (let i = 0; i < userNumber + 7; i++) {
                    if (balUsers[i].sub(balAfters[i]).abs().gte(utils.parseEther("1"))) {
                        console.log(`${i}th user problem! contract / calculated`);
                        console.log(utils.formatEther(balUsers[i].sub(balAfters[i]).abs()));
                        console.log("r/t rate", (await ij._getRate()).toString());
            fin = true;
                    }
                }
            } else {
                let numbers = Array.from({length: userNumber + 7}, (v, i) => i);
                numbers.sort(() => Math.random() - 0.5);
                numbers.length = accountNumber;

                for (let i = 0; i < accountNumber; i++) {
                    let n = numbers[i];
                    if (balUsers[n].sub(balAfters[n]).abs().gte(utils.parseEther("1"))) {
                        console.log(`${n}th user problem! contract / calculated`);
                        console.log(utils.formatEther(balUsers[n].sub(balAfters[n]).abs()));
                        console.log("r/t rate", (await ij._getRate()).toString());
            fin = true;
                    }
                }
            }

            if (
                total
                    .sub(balAfters[balAfters.length - 1])
                    .abs()
                    .gte(utils.parseEther("5"))
            ) {
                console.log(`total number problem! contract / calculated`);
                console.log(utils.formatEther(total));
                console.log(utils.formatEther(balAfters[balAfters.length - 1]));
                console.log(balAfters);
                console.log(extra);
                await show(true);
            }
            return fin;
        }

        function getUsersIndex(user: SignerWithAddress) {
            return _users.indexOf(user.address);
        }

        async function transferAndChek(user0: SignerWithAddress, user1: SignerWithAddress, amount: BigNumberish, accountNumber?: number) {
            const balAfters = await getBalances_(user0, user1, amount);
            await ij.connect(user0).transfer(user1.address, amount);
            await checking(
                balAfters as any,
                `from: ${getUsersIndex(user0)}, to: ${getUsersIndex(user1)} ${utils.formatEther(amount)}`,
                accountNumber
            );
        }

        async function randomAmount(user: SignerWithAddress) {
            const bal = await ij.balanceOf(user.address);
            const randPercent = Math.floor(Math.random() * 60) + 41;
            const ra = bal.mul(randPercent).div(100);
            return ra.gt(constants.Zero) ? ra : constants.One;
        }

        function randomUser() {
            const rand = Math.floor(Math.random() * (7 + userNumber));
            if (rand == 0) return A;
            else if (rand == 1) return B;
            else if (rand == 2) return C;
            else if (rand == 3) return D;
            else if (rand == 4) return E;
            else if (rand == 5) return F;
            else if (rand == 6) return owner;
            else {
                return users[rand - 7];
            }
        }

        function getUsers() {
            let user0 = randomUser() as SignerWithAddress;
            let user1 = randomUser() as SignerWithAddress;
            while (user0.address == user1.address) {
                user1 = randomUser() as SignerWithAddress;
            }
            return { user0, user1 };
        }

        await ij.transfer(A.address, utils.parseEther("85000000"));
        await ij.transfer(B.address, utils.parseEther("5000000"));
        await ij.transfer(C.address, utils.parseEther("1"));
        await ij.transfer(D.address, utils.parseEther("1"));
        await ij.transfer(E.address, utils.parseEther("1"));
        await ij.transfer(F.address, utils.parseEther("1"));
        await show();

        await ij.addToNoDistribution(A.address);

        async function transferCDEFUsersToA(percent: number) {
            for (let i = 0; i < userNumber; i++) {
                if (i == 0) {
                    await transferAndChek(C, A, (await ij.balanceOf(C.address)).mul(percent).div(100));
                    await transferAndChek(D, A, (await ij.balanceOf(D.address)).mul(percent).div(100));
                    await transferAndChek(E, A, (await ij.balanceOf(E.address)).mul(percent).div(100));
                    await transferAndChek(F, A, (await ij.balanceOf(F.address)).mul(percent).div(100));
                }
                await transferAndChek(users[i], A, (await ij.balanceOf(users[i].address)).mul(percent).div(100));
            }
        }

        async function transferCDEFUsersToAnoCheck(percent: number) {
            for (let i = 0; i < userNumber; i++) {
                if (i == 0) {
                    await ij.connect(C).transfer(A.address, (await ij.balanceOf(C.address)).mul(percent).div(100));
                    await ij.connect(D).transfer(A.address, (await ij.balanceOf(D.address)).mul(percent).div(100));
                    await ij.connect(E).transfer(A.address, (await ij.balanceOf(E.address)).mul(percent).div(100));
                    await ij.connect(F).transfer(A.address, (await ij.balanceOf(F.address)).mul(percent).div(100));
                }
                await ij
                    .connect(users[i])
                    .transfer(A.address, (await ij.balanceOf(users[i].address)).mul(percent).div(100));
            }
        }

        {
            await ij.connect(A).transfer(B.address, utils.parseEther("80000000"));
            await ij.connect(B).transfer(A.address, utils.parseEther("80000000"));
            await ij.connect(A).transfer(B.address, utils.parseEther("70000000"));
            await ij.connect(B).transfer(A.address, utils.parseEther("70000000"));

            for (let i = 0; i < 50; i++) {
                await ij.connect(A).transfer(B.address, (await ij.balanceOf(A.address)).mul(8).div(10));
                await ij.connect(B).transfer(A.address, await ij.balanceOf(B.address));
                await ij.connect(owner).transfer(A.address, await ij.balanceOf(owner.address));
            }

            await transferCDEFUsersToAnoCheck(100);

            for (let i = 0; i < 50; i++) {
                await ij.connect(A).transfer(B.address, (await ij.balanceOf(A.address)).mul(8).div(10));
                await ij.connect(B).transfer(A.address, (await ij.balanceOf(B.address)).mul(8).div(10));
                await ij.connect(owner).transfer(A.address, (await ij.balanceOf(owner.address)).mul(8).div(10));
            }

            for (let i = 0; i < userNumber; i++) {
                if (i == 0) {
                    await ij.connect(A).transfer(C.address, utils.parseEther("1"));
                    await ij.connect(A).transfer(D.address, utils.parseEther("1"));
                    await ij.connect(A).transfer(E.address, utils.parseEther("1"));
                    await ij.connect(A).transfer(F.address, utils.parseEther("1"));
                }
                await ij.connect(A).transfer(users[i].address, utils.parseEther("1"));
            }

            for (let i = 0; i < 50; i++) {
                await ij.connect(A).transfer(B.address, (await ij.balanceOf(A.address)).mul(8).div(10));
                await ij.connect(B).transfer(A.address, (await ij.balanceOf(B.address)).mul(8).div(10));
                await ij.connect(owner).transfer(A.address, (await ij.balanceOf(owner.address)).mul(8).div(10));
            }

            await transferCDEFUsersToAnoCheck(99);
            // await show(true);

            for (let i = 0; i < 50; i++) {
                await ij.connect(A).transfer(B.address, (await ij.balanceOf(A.address)).mul(8).div(10));
                await ij.connect(B).transfer(A.address, (await ij.balanceOf(B.address)).mul(8).div(10));
                await ij.connect(owner).transfer(A.address, (await ij.balanceOf(owner.address)).mul(8).div(10));
            }
            // console.log((await ij._getRate()).toString());

            await transferCDEFUsersToAnoCheck(99);
            // console.log((await ij._getRate()).toString());

            for (let i = 0; i < 50; i++) {
                await ij.connect(A).transfer(B.address, (await ij.balanceOf(A.address)).mul(8).div(10));
                await ij.connect(B).transfer(A.address, (await ij.balanceOf(B.address)).mul(8).div(10));
                await ij.connect(owner).transfer(A.address, (await ij.balanceOf(owner.address)).mul(8).div(10));
            }
            // console.log((await ij._getRate()).toString());

            await transferCDEFUsersToAnoCheck(99);
            // console.log((await ij._getRate()).toString());

            for (let i = 0; i < 50; i++) {
                await ij.connect(A).transfer(B.address, (await ij.balanceOf(A.address)).mul(8).div(10));
                await ij.connect(B).transfer(A.address, (await ij.balanceOf(B.address)).mul(8).div(10));
                await ij.connect(owner).transfer(A.address, (await ij.balanceOf(owner.address)).mul(8).div(10));
            }

            await transferCDEFUsersToAnoCheck(99);

            for (let i = 0; i < 50; i++) {
                await ij.connect(A).transfer(B.address, (await ij.balanceOf(A.address)).mul(8).div(10));
                await ij.connect(B).transfer(A.address, (await ij.balanceOf(B.address)).mul(8).div(10));
                await ij.connect(owner).transfer(A.address, (await ij.balanceOf(owner.address)).mul(8).div(10));
            }

            await transferCDEFUsersToAnoCheck(99);

            for (let i = 0; i < 50; i++) {
                await ij.connect(A).transfer(B.address, (await ij.balanceOf(A.address)).mul(8).div(10));
                await ij.connect(B).transfer(A.address, (await ij.balanceOf(B.address)).mul(8).div(10));
                await ij.connect(owner).transfer(A.address, (await ij.balanceOf(owner.address)).mul(8).div(10));
            }

            await transferCDEFUsersToAnoCheck(99);

            for (let i = 0; i < 50; i++) {
                await ij.connect(A).transfer(B.address, (await ij.balanceOf(A.address)).mul(8).div(10));
                await ij.connect(B).transfer(A.address, (await ij.balanceOf(B.address)).mul(8).div(10));
                await ij.connect(owner).transfer(A.address, (await ij.balanceOf(owner.address)).mul(8).div(10));
            }

            await transferCDEFUsersToAnoCheck(99);

            for (let i = 0; i < 50; i++) {
                await ij.connect(A).transfer(B.address, (await ij.balanceOf(A.address)).mul(8).div(10));
                await ij.connect(B).transfer(A.address, (await ij.balanceOf(B.address)).mul(8).div(10));
                await ij.connect(owner).transfer(A.address, (await ij.balanceOf(owner.address)).mul(8).div(10));
            }

            await transferCDEFUsersToAnoCheck(99);

            for (let i = 0; i < 50; i++) {
                await ij.connect(A).transfer(B.address, (await ij.balanceOf(A.address)).mul(8).div(10));
                await ij.connect(B).transfer(A.address, (await ij.balanceOf(B.address)).mul(8).div(10));
                await ij.connect(owner).transfer(A.address, (await ij.balanceOf(owner.address)).mul(8).div(10));
            }

            await transferCDEFUsersToAnoCheck(99);

            for (let i = 0; i < 50; i++) {
                await ij.connect(A).transfer(B.address, (await ij.balanceOf(A.address)).mul(8).div(10));
                await ij.connect(B).transfer(A.address, (await ij.balanceOf(B.address)).mul(8).div(10));
                await ij.connect(owner).transfer(A.address, (await ij.balanceOf(owner.address)).mul(8).div(10));
            }

            await transferCDEFUsersToAnoCheck(99);
            await show(true);
        }
        // 157477322571
{
    for (let i = 0; i < 50; i++) {
        await ij.connect(A).transfer(B.address, (await ij.balanceOf(A.address)).mul(8).div(10));
        await ij.connect(B).transfer(A.address, (await ij.balanceOf(B.address)).mul(8).div(10));
        await ij.connect(owner).transfer(A.address, (await ij.balanceOf(owner.address)).mul(8).div(10));
    }

    await transferCDEFUsersToAnoCheck(99);
    await show();
    for (let i = 0; i < 50; i++) {
        await ij.connect(A).transfer(B.address, (await ij.balanceOf(A.address)).mul(8).div(10));
        await ij.connect(B).transfer(A.address, (await ij.balanceOf(B.address)).mul(8).div(10));
        await ij.connect(owner).transfer(A.address, (await ij.balanceOf(owner.address)).mul(8).div(10));
    }
    await transferCDEFUsersToAnoCheck(99);
    await show();

    for (let i = 0; i < 30; i++) {
        await ij.connect(A).transfer(B.address, (await ij.balanceOf(A.address)).mul(8).div(10));
        await ij.connect(B).transfer(A.address, (await ij.balanceOf(B.address)).mul(8).div(10));
        await ij.connect(owner).transfer(A.address, (await ij.balanceOf(owner.address)).mul(8).div(10));

        const rate = await ij._getRate();
        if(rate.lte(40000000) && rate.gte(30000000)) {
            console.log(i,"th in loop");
            break;
        }
    }
    await show();
}
        for (let i = 0; i < 20000; i++) {
            let users = getUsers();
            while ((await ij.balanceOf(users.user0.address)).isZero()) {
                users = getUsers();
            }

            let amount = await randomAmount(users.user0);

            // await show(true);
            // console.log(`${i}th transfer. from: ${getUsersIndex(users.user0)}, to: ${getUsersIndex(users.user1)} ${utils.formatEther(amount)}`);

            let doCheck = true;
            // let doCheck = false;
            // if(i > 16000) doCheck = true;

            if ((i < 1000 && i % 100 == 0) || i % 1000 == 0) {
                console.log(i, "th");
                console.log((await ij._getRate()).toString());
                if (i >= 1000) await show(true);
            }
            let balAfters;

            if (doCheck) balAfters = await getBalances_(users.user0, users.user1, amount);
            await ij.connect(users.user0).transfer(users.user1.address, amount);
            if (doCheck){
            let fin = await checking(
                    balAfters as any,
                    `${i}th transfer. from: ${getUsersIndex(users.user0)}, to: ${getUsersIndex(
                        users.user1
                    )} ${utils.formatEther(amount)}`,
                    500
                );
                if(fin) break;
            }

            // await show(true);
        }
    });
});
